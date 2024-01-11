import type { KernelSmartAccount } from "@kerneljs/core"
import type { Hex } from "viem"
import {
    isSessionKeyValidatorPlugin,
    serializeSessionKeyAccountParams
} from "./utils.js"

export const accountToSerializedSessionKeyAccountParams = async (
    account: KernelSmartAccount,
    privateKey?: Hex
): Promise<string> => {
    if (!isSessionKeyValidatorPlugin(account.plugin))
        throw new Error("Account plugin is not a session key validator")
    const sessionKeyParams = account.plugin.exportSessionKeyParams()
    const enableSignature = await account.getPluginEnableSignature()

    const paramsToBeSerialized = {
        initCode: await account.generateInitCode(),
        sessionKeyParams,
        enableSignature,
        privateKey
    }

    return serializeSessionKeyAccountParams(paramsToBeSerialized)
}
