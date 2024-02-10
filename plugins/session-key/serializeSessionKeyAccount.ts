import type { KernelSmartAccount } from "@zerodev/sdk"
import type { Hex } from "viem"
import {
    isSessionKeyValidatorPlugin,
    serializeSessionKeyAccountParams
} from "./utils.js"

export const serializeSessionKeyAccount = async (
    account: KernelSmartAccount,
    privateKey?: Hex
): Promise<string> => {
    if (!isSessionKeyValidatorPlugin(account.kernelPluginManager))
        throw new Error("Account plugin is not a session key validator")
    const sessionKeyParams =
        account.kernelPluginManager.getPluginSerializationParams()
    const executorData = account.kernelPluginManager.getExecutorData()
    const validityData = account.kernelPluginManager.getValidityData()
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
        validityData,
        accountParams,
        enableSignature,
        privateKey
    }

    return serializeSessionKeyAccountParams(paramsToBeSerialized)
}
