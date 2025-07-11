import {
    KernelFactoryStakerAbi,
    KernelV3AccountAbi,
    KernelV3FactoryAbi,
    KernelV3_1AccountAbi,
    createKernelAccount
} from "@zerodev/sdk"
import {
    type KernelSmartAccountImplementation,
    toKernelPluginManager
} from "@zerodev/sdk/accounts"
import type {
    EntryPointType,
    GetKernelVersion,
    KERNEL_VERSION_TYPE,
    ValidatorInitData
} from "@zerodev/sdk/types"
import type { Hex } from "viem"
import { decodeFunctionData } from "viem"
import type { EntryPointVersion } from "viem/account-abstraction"
import { privateKeyToAccount } from "viem/accounts"
import type { DecodeFunctionDataReturnType } from "viem/utils"
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
import { isKernelVersionAfter } from "./utils.js"

export const deserializePermissionAccount = async <
    entryPointVersion extends EntryPointVersion
>(
    client: KernelSmartAccountImplementation["client"],
    entryPoint: EntryPointType<entryPointVersion>,
    kernelVersion: GetKernelVersion<entryPointVersion>,
    modularPermissionAccountParams: string,
    modularSigner?: ModularSigner
) => {
    if (entryPoint.version !== "0.7") {
        throw new Error("Only EntryPoint 0.7 is supported")
    }
    const params = deserializePermissionAccountParams(
        modularPermissionAccountParams
    )
    let signer: ModularSigner
    if (params.privateKey)
        signer = await toECDSASigner({
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
        entryPoint,
        kernelVersion
    })

    const { index, validatorInitData, useMetaFactory } =
        decodeParamsFromInitCode(params.accountParams.initCode, kernelVersion)

    const kernelPluginManager = await toKernelPluginManager(client, {
        regular: modularPermissionPlugin,
        pluginEnableSignature: params.isPreInstalled
            ? undefined
            : params.enableSignature,
        validatorInitData,
        action: params.action,
        entryPoint,
        kernelVersion,
        isPreInstalled: params.isPreInstalled,
        ...params.validityData
    })

    return createKernelAccount(client, {
        entryPoint,
        kernelVersion,
        plugins: kernelPluginManager,
        index,
        address: params.accountParams.accountAddress,
        useMetaFactory,
        eip7702Auth: params.eip7702Auth
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
    let deployWithFactoryFunctionData:
        | DecodeFunctionDataReturnType<typeof KernelFactoryStakerAbi>
        | DecodeFunctionDataReturnType<typeof KernelV3FactoryAbi>
    let useMetaFactory = true
    if (initCode === "0x") {
        return {
            index: undefined,
            validatorInitData: undefined,
            useMetaFactory: true
        }
    }
    try {
        deployWithFactoryFunctionData = decodeFunctionData({
            abi: KernelFactoryStakerAbi,
            data: initCode
        })
    } catch (error) {
        deployWithFactoryFunctionData = decodeFunctionData({
            abi: KernelV3FactoryAbi,
            data: initCode
        })
        useMetaFactory = false
    }
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
                enableData: initializeFunctionData.args[2],
                initConfig:
                    isKernelVersionAfter(kernelVersion, "0.3.1") &&
                    Array.isArray(initializeFunctionData.args[4])
                        ? [...initializeFunctionData.args[4]]
                        : undefined
            }
        }
    } else if (deployWithFactoryFunctionData.functionName === "createAccount") {
        index = BigInt(deployWithFactoryFunctionData.args[1])
        let initializeFunctionData:
            | DecodeFunctionDataReturnType<typeof KernelV3AccountAbi>
            | DecodeFunctionDataReturnType<typeof KernelV3_1AccountAbi>
        if (kernelVersion === "0.3.0") {
            initializeFunctionData = decodeFunctionData({
                abi: KernelV3AccountAbi,
                data: deployWithFactoryFunctionData.args[0]
            })
        } else {
            initializeFunctionData = decodeFunctionData({
                abi: KernelV3_1AccountAbi,
                data: deployWithFactoryFunctionData.args[0]
            })
        }
        if (!initializeFunctionData) throw new Error("Invalid initCode")
        if (initializeFunctionData.functionName === "initialize") {
            validatorInitData = {
                validatorAddress: initializeFunctionData.args[0],
                identifier: initializeFunctionData.args[0],
                enableData: initializeFunctionData.args[2],
                initConfig:
                    isKernelVersionAfter(kernelVersion, "0.3.1") &&
                    Array.isArray(initializeFunctionData.args[4])
                        ? [...initializeFunctionData.args[4]]
                        : undefined
            }
        }
    }
    if (index === undefined || validatorInitData === undefined)
        throw new Error("Invalid initCode")
    return { index, validatorInitData, useMetaFactory }
}
