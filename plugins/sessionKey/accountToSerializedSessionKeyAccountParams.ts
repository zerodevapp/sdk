import type { KernelSmartAccount } from "@kerneljs/core"
import type { Hex } from "viem"
import {
    isSessionKeyValidatorPlugin,
    serializeSessionKeyAccountParams
} from "./utils.js"

// export const accountToSerializedSessionKeyAccountParams = async (
//     account: KernelSmartAccount,
//     privateKey?: Hex
// ): Promise<string> => {
//     if (!isSessionKeyValidatorPlugin(account.plugin))
//         throw new Error("Account plugin is not a session key validator")
//     const sessionKeyParams = account.plugin.getPluginSerializationParams()
//     const enableSignature = await account.getPluginEnableSignature()

//     const paramsToBeSerialized = {
//         initCode: await account.generateInitCode(),
//         sessionKeyParams,
//         enableSignature,
//         privateKey
//     }

//     return serializeSessionKeyAccountParams(paramsToBeSerialized)
// }

export const accountToSerializedSessionKeyAccountParams = async (
    account: KernelSmartAccount,
    privateKey?: Hex
): Promise<string> => {
    if (!isSessionKeyValidatorPlugin(account.kernelPluginManager))
        throw new Error("Account plugin is not a session key validator")
    const sessionKeyParams =
        account.kernelPluginManager.getPluginSerializationParams()
    const executorData = account.kernelPluginManager.getExecutorData()
    const enableSignature =
        await account.kernelPluginManager.getPluginEnableSignature(
            account.address
        )
    const accountParams = {
        initCode: await account.generateInitCode(),
        accountAddress: account.address
    }

    const paramsToBeSerialized = {
        sessionKeyParams,
        executorData,
        accountParams,
        enableSignature,
        privateKey
    }

    return serializeSessionKeyAccountParams(paramsToBeSerialized)
}
