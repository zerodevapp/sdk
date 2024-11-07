import { KernelAccountAbi, createKernelAccount } from "@zerodev/sdk"
import { KernelFactoryAbi } from "@zerodev/sdk"
import {
    type KernelSmartAccountImplementation,
    toKernelPluginManager
} from "@zerodev/sdk/accounts"
import type { GetKernelVersion, ValidatorInitData } from "@zerodev/sdk/types"
import type { Address, Client, Hex, LocalAccount } from "viem"
import { decodeFunctionData } from "viem"
import type { EntryPointVersion, SmartAccount } from "viem/account-abstraction"
import { privateKeyToAccount } from "viem/accounts"
import { SESSION_KEY_VALIDATOR_ADDRESS } from "./index.js"
import { signerToSessionKeyValidator } from "./toSessionKeyValidatorPlugin.js"
import { deserializeSessionKeyAccountParams } from "./utils.js"

export const deserializeSessionKeyAccount = async <
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    entryPoint: { address: Address; version: entryPointVersion },
    kernelVersion: GetKernelVersion<entryPointVersion>,
    sessionKeyAccountParams: string,
    sessionKeySigner?: LocalAccount,
    validatorAddress: Address = SESSION_KEY_VALIDATOR_ADDRESS
): Promise<
    SmartAccount<KernelSmartAccountImplementation<entryPointVersion>>
> => {
    if (entryPoint.version !== "0.6") {
        throw new Error("Only EntryPoint 0.6 is supported")
    }
    const params = deserializeSessionKeyAccountParams(sessionKeyAccountParams)
    let signer: LocalAccount
    if (params.privateKey) signer = privateKeyToAccount(params.privateKey)
    else if (sessionKeySigner) signer = sessionKeySigner
    else throw new Error("No signer or serialized sessionKey provided")

    const sessionKeyPlugin = await signerToSessionKeyValidator(client, {
        signer,
        validatorData: params.sessionKeyParams,
        entryPoint,
        kernelVersion,
        validatorAddress
    })

    const { index, validatorInitData } = decodeParamsFromInitCode(
        params.accountParams.initCode
    )

    const kernelPluginManager = await toKernelPluginManager(client, {
        regular: sessionKeyPlugin,
        pluginEnableSignature: params.enableSignature,
        validatorInitData,
        action: params.action,
        entryPoint,
        kernelVersion,
        ...params.validityData
    })

    return createKernelAccount(client, {
        plugins: kernelPluginManager,
        index,
        address: params.accountParams.accountAddress,
        entryPoint,
        kernelVersion
    })
}

export const decodeParamsFromInitCode = (initCode: Hex) => {
    let index: bigint | undefined
    let validatorInitData: ValidatorInitData | undefined
    if (initCode === "0x") return { index, validatorInitData }
    const createAccountFunctionData = decodeFunctionData({
        abi: KernelFactoryAbi,
        data: initCode
    })
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
    return { index, validatorInitData }
}
