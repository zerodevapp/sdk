import type { KernelSmartAccount } from "@zerodev/sdk"
import type { Hex } from "viem"
import {
    isModularPermissionValidatorPlugin,
    serializeModularPermissionAccountParams
} from "./utils.js"

export const serializeModularPermissionAccount = async (
    account: KernelSmartAccount,
    privateKey?: Hex
): Promise<string> => {
    if (!isModularPermissionValidatorPlugin(account.kernelPluginManager))
        throw new Error("Account plugin is not a modular permission validator")
    const modularPermissionParams =
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
        modularPermissionParams,
        executorData,
        validityData,
        accountParams,
        enableSignature,
        privateKey
    }

    return serializeModularPermissionAccountParams(paramsToBeSerialized)
}
