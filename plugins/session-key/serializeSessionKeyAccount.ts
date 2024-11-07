import type { Hex } from "viem"
import {
    isSessionKeyValidatorPlugin,
    serializeSessionKeyAccountParams
} from "./utils.js"
import type { EntryPointVersion, SmartAccount } from "viem/account-abstraction"
import type { KernelSmartAccountImplementation } from "@zerodev/sdk"

export const serializeSessionKeyAccount = async <entryPointVersion extends EntryPointVersion>(
    account: SmartAccount<KernelSmartAccountImplementation<entryPointVersion>>,
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
        initCode: await account.generateInitCode(),
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
