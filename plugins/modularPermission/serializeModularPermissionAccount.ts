import type { KernelSmartAccountImplementation } from "@zerodev/sdk"
import type { Hex } from "viem"
import type { EntryPointVersion, SmartAccount } from "viem/account-abstraction"
import {
    isModularPermissionValidatorPlugin,
    serializeModularPermissionAccountParams
} from "./utils.js"

export const serializeModularPermissionAccount = async <
    entryPointVersion extends EntryPointVersion
>(
    account: SmartAccount<KernelSmartAccountImplementation<entryPointVersion>>,
    privateKey?: Hex
): Promise<string> => {
    if (!isModularPermissionValidatorPlugin(account.kernelPluginManager))
        throw new Error("Account plugin is not a modular permission validator")
    const modularPermissionParams =
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
        modularPermissionParams,
        action,
        validityData,
        accountParams,
        enableSignature,
        privateKey
    }

    return serializeModularPermissionAccountParams(paramsToBeSerialized)
}
