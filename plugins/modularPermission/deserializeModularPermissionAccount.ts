import { KernelAccountAbi, createKernelAccount } from "@zerodev/sdk"
import { KernelFactoryAbi } from "@zerodev/sdk"
import { toKernelPluginManager } from "@zerodev/sdk/accounts"
import type {
    EntryPointType,
    GetKernelVersion,
    ValidatorInitData
} from "@zerodev/sdk/types"
import type { Client, Hex } from "viem"
import { decodeFunctionData } from "viem"
import type { EntryPointVersion } from "viem/account-abstraction"
import { privateKeyToAccount } from "viem/accounts"
import {
    toGasPolicy,
    toMerklePolicy,
    toSignaturePolicy,
    toSudoPolicy
} from "./policies/index.js"
import type { Policy } from "./policies/types.js"
import { toECDSASigner } from "./signers/toECDSASigner.js"
import type { ModularSigner } from "./signers/types.js"
import { createPermissionValidator } from "./toModularPermissionValidatorPlugin.js"
import { deserializeModularPermissionAccountParams } from "./utils.js"

export const deserializeModularPermissionAccount = async <
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    entryPoint: EntryPointType<entryPointVersion>,
    kernelVersion: GetKernelVersion<entryPointVersion>,
    modularPermissionAccountParams: string,
    modularSigner?: ModularSigner
) => {
    const params = deserializeModularPermissionAccountParams(
        modularPermissionAccountParams
    )
    let signer: ModularSigner
    if (params.privateKey)
        signer = await toECDSASigner({
            signer: privateKeyToAccount(params.privateKey)
        })
    else if (modularSigner) signer = modularSigner
    else throw new Error("No signer or serialized sessionKey provided")

    const modularPermissionPlugin = await createPermissionValidator(client, {
        signer,
        policies: await Promise.all(
            params.modularPermissionParams.policies?.map((policy) =>
                createPolicyFromParams(policy)
            ) || []
        ),
        validUntil: params.modularPermissionParams.validUntil || 0,
        validAfter: params.modularPermissionParams.validAfter || 0,
        entryPoint,
        kernelVersion
    })

    const { index, validatorInitData } = decodeParamsFromInitCode(
        params.accountParams.initCode
    )

    const kernelPluginManager = await toKernelPluginManager(client, {
        regular: modularPermissionPlugin,
        pluginEnableSignature: params.enableSignature,
        validatorInitData,
        action: params.action,
        entryPoint,
        kernelVersion,
        ...params.validityData
    })

    return createKernelAccount(client, {
        entryPoint,
        kernelVersion,
        plugins: kernelPluginManager,
        index,
        address: params.accountParams.accountAddress
    })
}

export const createPolicyFromParams = async (policy: Policy) => {
    switch (policy.policyParams.type) {
        case "sudo":
            return await toSudoPolicy(policy.policyParams)
        case "signature":
            return await toSignaturePolicy(policy.policyParams)
        case "merkle":
            return await toMerklePolicy(policy.policyParams)
        case "gas":
            return await toGasPolicy(policy.policyParams)
        default:
            throw new Error("Unsupported policy type")
    }
}

export const decodeParamsFromInitCode = (initCode: Hex) => {
    let index: bigint | undefined
    let validatorInitData: ValidatorInitData | undefined
    const createAccountFunctionData = decodeFunctionData({
        abi: KernelFactoryAbi,
        data: initCode
    })
    if (!createAccountFunctionData) throw new Error("Invalid initCode")
    if (createAccountFunctionData.functionName === "createAccount") {
        index = createAccountFunctionData.args[2]
        const initializeFunctionData = decodeFunctionData({
            abi: KernelAccountAbi,
            data: createAccountFunctionData.args[1]
        })
        if (!initializeFunctionData) throw new Error("Invalid initCode")
        if (initializeFunctionData.functionName === "initialize") {
            validatorInitData = {
                validatorAddress: initializeFunctionData.args[0],
                identifier: initializeFunctionData.args[0],
                enableData: initializeFunctionData.args[1]
            }
        }
    }
    if (index === undefined || validatorInitData === undefined)
        throw new Error("Invalid initCode")
    return { index, validatorInitData }
}
