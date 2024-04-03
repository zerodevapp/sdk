import { KernelV3AccountAbi, createKernelAccount } from "@zerodev/sdk"
import { KernelFactoryAbi } from "@zerodev/sdk"
import { toKernelPluginManager } from "@zerodev/sdk/accounts"
import type { ValidatorInitData } from "@zerodev/sdk/types"
import { ENTRYPOINT_ADDRESS_V06 } from "permissionless"
import type { EntryPoint } from "permissionless/types"
import type { Hex } from "viem"
import { decodeFunctionData } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import {
    toCallPolicy,
    toGasPolicy,
    toRateLimitPolicy,
    toSignatureCallerPolicy,
    toSudoPolicy
} from "./policies/index.js"
import { toECDSASigner } from "./signers/toECDSASigner.js"
import { toPermissionValidator } from "./toPermissionValidator.js"
import { type Policy } from "./types.js"
import type { ModularSigner } from "./types.js"
import { deserializePermissionAccountParams } from "./utils.js"

export const deserializePermissionAccount = async <
    entryPoint extends EntryPoint
>(
    client: Parameters<typeof createKernelAccount>[0],
    modularPermissionAccountParams: string,
    modularSigner?: ModularSigner,
    entryPointAddress: entryPoint = ENTRYPOINT_ADDRESS_V06 as entryPoint
) => {
    const params = deserializePermissionAccountParams(
        modularPermissionAccountParams
    )
    let signer: ModularSigner
    if (params.privateKey)
        signer = toECDSASigner({
            signer: privateKeyToAccount(params.privateKey)
        })
    else if (modularSigner) signer = modularSigner
    else throw new Error("No signer or serialized sessionKey provided")

    const modularPermissionPlugin = await toPermissionValidator(client, {
        signer,
        policies: await Promise.all(
            params.permissionParams.policies?.map((policy) =>
                createPolicyFromParams(policy)
            ) || []
        ),
        entryPoint: entryPointAddress
    })

    const { index, validatorInitData } = decodeParamsFromInitCode(
        params.accountParams.initCode
    )

    const kernelPluginManager = await toKernelPluginManager<entryPoint>(
        client,
        {
            regular: modularPermissionPlugin,
            pluginEnableSignature: params.enableSignature,
            validatorInitData,
            action: params.action,
            entryPoint: entryPointAddress,
            ...params.validityData
        }
    )

    return createKernelAccount<entryPoint>(client, {
        plugins: kernelPluginManager,
        index,
        deployedAccountAddress: params.accountParams.accountAddress,
        entryPoint: entryPointAddress
    })
}

export const createPolicyFromParams = async (policy: Policy) => {
    switch (policy.policyParams.type) {
        case "call":
            return await toCallPolicy(policy.policyParams)
        case "gas":
            return await toGasPolicy(policy.policyParams)
        case "rate-limit":
            return await toRateLimitPolicy(policy.policyParams)
        case "signature-caller":
            return await toSignatureCallerPolicy(policy.policyParams)
        case "sudo":
            return await toSudoPolicy(policy.policyParams)
        default:
            throw new Error("Unsupported policy type")
    }
}

export const decodeParamsFromInitCode = (initCode: Hex) => {
    let index: bigint | undefined
    let validatorInitData: ValidatorInitData | undefined
    const createAccountFunctionData = decodeFunctionData({
        abi: KernelFactoryAbi,
        data: `0x${initCode.slice(42)}`
    })
    if (!createAccountFunctionData) throw new Error("Invalid initCode")
    if (createAccountFunctionData.functionName === "createAccount") {
        index = createAccountFunctionData.args[2]
        const initializeFunctionData = decodeFunctionData({
            abi: KernelV3AccountAbi,
            data: createAccountFunctionData.args[1]
        })
        if (!initializeFunctionData) throw new Error("Invalid initCode")
        if (initializeFunctionData.functionName === "initialize") {
            validatorInitData = {
                validatorAddress: initializeFunctionData.args[0],
                identifier: initializeFunctionData.args[0],
                enableData: initializeFunctionData.args[2]
            }
        }
    }
    if (index === undefined || validatorInitData === undefined)
        throw new Error("Invalid initCode")
    return { index, validatorInitData }
}
