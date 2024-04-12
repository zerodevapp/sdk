import type { KernelSmartAccount } from "@zerodev/sdk"
import type { EntryPoint } from "permissionless/types/entrypoint"
import type { Hex } from "viem"
import {
    isSessionKeyValidatorPlugin,
    serializeSessionKeyAccountParams
} from "./utils.js"

export const serializeSessionKeyAccount = async <entryPoint extends EntryPoint>(
    account: KernelSmartAccount<entryPoint>,
    privateKey?: Hex
): Promise<string> => {
    if (!isSessionKeyValidatorPlugin(account.kernelPluginManager))
        throw new Error("Account plugin is not a session key validator")
    const sessionKeyParams =
        account.kernelPluginManager.getPluginSerializationParams()
    const action = account.kernelPluginManager.getAction()
    const validityData = account.kernelPluginManager.getValidityData()
    const enableSignature =
        await account.kernelPluginManager.getPluginEnableSignature(
            account.address
        )
    const accountParams = {
        initCode: await account.getInitCode(),
        accountAddress: account.address
    }

    const paramsToBeSerialized = {
        sessionKeyParams,
        action,
        validityData,
        accountParams,
        enableSignature,
        privateKey
    }

    return serializeSessionKeyAccountParams(paramsToBeSerialized)
}
