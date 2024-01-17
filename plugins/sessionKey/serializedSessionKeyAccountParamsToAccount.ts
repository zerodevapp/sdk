import { KernelAccountAbi, createKernelAccount } from "@kerneljs/core"
import type { SmartAccountSigner } from "permissionless/accounts"
import type { Address, Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { decodeFunctionData } from "viem"
import { signerToSessionKeyValidator } from "./toSessionKeyValidatorPlugin.js"
import { deserializeSessionKeyAccountParams } from "./utils.js"
import { toKernelPluginManager } from "@kerneljs/core/accounts"
import { KernelFactoryAbi } from "@kerneljs/core"
import type { ValidatorInitData } from "@kerneljs/core/types"

export const serializedSessionKeyAccountParamsToAccount = async <
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Parameters<typeof createKernelAccount>[0],
    sessionKeyAccountParams: string,
    sessionKeysigner?: SmartAccountSigner<TSource, TAddress>
) => {
    const params = deserializeSessionKeyAccountParams(sessionKeyAccountParams)
    let signer: SmartAccountSigner<string, Hex>
    if (params.privateKey) signer = privateKeyToAccount(params.privateKey)
    else if (sessionKeysigner) signer = sessionKeysigner
    else throw new Error("No signer or serialized sessionKey provided")

    const sessionKeyPlugin = await signerToSessionKeyValidator(client, {
        signer,
        validatorData: params.sessionKeyParams.sessionKeyData,
        executorData: params.sessionKeyParams.executorData
    })

    const { index, validatorInitData } = decodeParamsFromInitCode(
        params.accountParams.initCode
    )

    const kernelPluginManager = await toKernelPluginManager(client, {
        validator: sessionKeyPlugin,
        pluginEnableSignature: params.enableSignature,
        validatorInitData
    })

    return createKernelAccount(client, {
        plugins: kernelPluginManager,
        index,
        deployedAccountAddress: params.accountParams.accountAddress
    })
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
            abi: KernelAccountAbi,
            data: createAccountFunctionData.args[1]
        })
        if (!initializeFunctionData) throw new Error("Invalid initCode")
        if (initializeFunctionData.functionName === "initialize") {
            validatorInitData = {
                validatorAddress: initializeFunctionData.args[0],
                enableData: initializeFunctionData.args[1]
            }
        }
    }
    if (index === undefined || validatorInitData === undefined)
        throw new Error("Invalid initCode")
    return { index, validatorInitData }
}
