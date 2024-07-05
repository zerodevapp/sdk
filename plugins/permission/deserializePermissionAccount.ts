import {
    KernelFactoryStakerAbi,
    KernelV3AccountAbi,
    KernelV3_1AccountAbi,
    createKernelAccount
} from "@zerodev/sdk"
import { toKernelPluginManager } from "@zerodev/sdk/accounts"
import type {
    GetKernelVersion,
    KERNEL_VERSION_TYPE,
    ValidatorInitData
} from "@zerodev/sdk/types"
import { getEntryPointVersion } from "permissionless"
import type { SmartAccountSigner } from "permissionless/accounts"
import type { EntryPoint } from "permissionless/types"
import type { Chain, Client, Hex, Transport } from "viem"
import { decodeFunctionData } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import type { DecodeFunctionDataReturnType } from "viem/utils/abi/decodeFunctionData.js"
import {
    toCallPolicy,
    toGasPolicy,
    toRateLimitPolicy,
    toSignatureCallerPolicy,
    toSudoPolicy,
    toTimestampPolicy
} from "./policies/index.js"
import { toECDSASigner } from "./signers/toECDSASigner.js"
import { toPermissionValidator } from "./toPermissionValidator.js"
import type { Policy } from "./types.js"
import type { ModularSigner } from "./types.js"
import { deserializePermissionAccountParams } from "./utils.js"

export const deserializePermissionAccount = async <
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    entryPointAddress: entryPoint,
    kernelVersion: GetKernelVersion<entryPoint>,
    modularPermissionAccountParams: string,
    modularSigner?: ModularSigner
) => {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)

    if (entryPointVersion !== "v0.7") {
        throw new Error("Only EntryPoint 0.7 is supported")
    }
    const params = deserializePermissionAccountParams(
        modularPermissionAccountParams
    )
    let signer: ModularSigner
    if (params.privateKey)
        signer = toECDSASigner({
            signer: privateKeyToAccount(
                params.privateKey
            ) as SmartAccountSigner<"privateKey", `0x${string}`>
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
        entryPoint: entryPointAddress,
        kernelVersion
    })

    const { index, validatorInitData } = decodeParamsFromInitCode(
        params.accountParams.initCode,
        kernelVersion
    )

    const kernelPluginManager = await toKernelPluginManager(client, {
        regular: modularPermissionPlugin,
        pluginEnableSignature: params.enableSignature,
        validatorInitData,
        action: params.action,
        entryPoint: entryPointAddress,
        kernelVersion,
        ...params.validityData
    })

    return createKernelAccount(client, {
        entryPoint: entryPointAddress,
        kernelVersion,
        plugins: kernelPluginManager,
        index,
        deployedAccountAddress: params.accountParams.accountAddress
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
        case "timestamp":
            return await toTimestampPolicy(policy.policyParams)
        default:
            throw new Error("Unsupported policy type")
    }
}

export const decodeParamsFromInitCode = (
    initCode: Hex,
    kernelVersion: KERNEL_VERSION_TYPE
) => {
    let index: bigint | undefined
    let validatorInitData: ValidatorInitData | undefined
    const deployWithFactoryFunctionData = decodeFunctionData({
        abi: KernelFactoryStakerAbi,
        data: `0x${initCode.slice(42)}`
    })
    if (!deployWithFactoryFunctionData) throw new Error("Invalid initCode")
    if (deployWithFactoryFunctionData.functionName === "deployWithFactory") {
        index = BigInt(deployWithFactoryFunctionData.args[2])
        let initializeFunctionData:
            | DecodeFunctionDataReturnType<typeof KernelV3AccountAbi>
            | DecodeFunctionDataReturnType<typeof KernelV3_1AccountAbi>
        if (kernelVersion === "0.3.0") {
            initializeFunctionData = decodeFunctionData({
                abi: KernelV3AccountAbi,
                data: deployWithFactoryFunctionData.args[1]
            })
        } else {
            initializeFunctionData = decodeFunctionData({
                abi: KernelV3_1AccountAbi,
                data: deployWithFactoryFunctionData.args[1]
            })
        }
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
