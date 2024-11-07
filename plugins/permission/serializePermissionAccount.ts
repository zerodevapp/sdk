import type { KernelSmartAccountImplementation } from "@zerodev/sdk"
import type { Hex } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import {
    isPermissionValidatorPlugin,
    serializePermissionAccountParams
} from "./utils.js"

export const serializePermissionAccount = async (
    account: SmartAccount<KernelSmartAccountImplementation>,
    privateKey?: Hex,
    enableSignature?: Hex
): Promise<string> => {
    if (!isPermissionValidatorPlugin(account.kernelPluginManager))
        throw new Error("Account plugin is not a permission validator")
    const permissionParams =
        account.kernelPluginManager.getPluginSerializationParams()
    const action = account.kernelPluginManager.getAction()
    const validityData = account.kernelPluginManager.getValidityData()
    const _enableSignature =
        enableSignature ??
        (await account.kernelPluginManager.getPluginEnableSignature(
            account.address
        ))
    const accountParams = {
        initCode: await account.generateInitCode(),
        accountAddress: account.address
    }

    const paramsToBeSerialized = {
        permissionParams,
        action,
        validityData,
        accountParams,
        enableSignature: _enableSignature,
        privateKey
    }

    return serializePermissionAccountParams(paramsToBeSerialized)
}
