import type { KernelSmartAccountImplementation } from "@zerodev/sdk"
import type { Hex } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import type { SignAuthorizationReturnType } from "viem/accounts"
import type { PermissionData, PermissionPlugin } from "./types.js"
import {
    isPermissionValidatorPlugin,
    serializePermissionAccountParams
} from "./utils.js"

export const serializePermissionAccount = async (
    account: SmartAccount<KernelSmartAccountImplementation>,
    privateKey?: Hex,
    enableSignature?: Hex,
    eip7702Auth?: SignAuthorizationReturnType,
    permissionPlugin?: PermissionPlugin,
    isExternalPermissionPlugin?: boolean
): Promise<string> => {
    let permissionParams: PermissionData
    let isPreInstalled = false
    const action = account.kernelPluginManager.getAction()
    const validityData = account.kernelPluginManager.getValidityData()

    // Check if permission plugin is in kernelPluginManager
    if (
        isPermissionValidatorPlugin(account.kernelPluginManager) &&
        !isExternalPermissionPlugin
    ) {
        permissionParams =
            account.kernelPluginManager.getPluginSerializationParams()
    } else if (permissionPlugin) {
        // Permission plugin provided externally (initConfig case)
        permissionParams = permissionPlugin.getPluginSerializationParams()
        isPreInstalled = !isExternalPermissionPlugin
    } else {
        throw new Error("No permission validator found in account or provided")
    }

    const _enableSignature = isPreInstalled
        ? undefined
        : (enableSignature ??
          (await account.kernelPluginManager.getPluginEnableSignature(
              account.address,
              isExternalPermissionPlugin ? permissionPlugin : undefined // override permission plugin if externalPlugin
          )))
    const _eip7702Auth = account.authorization
        ? (eip7702Auth ?? (await account?.eip7702Authorization?.()))
        : undefined
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
        privateKey,
        eip7702Auth: _eip7702Auth,
        isPreInstalled
    }

    return serializePermissionAccountParams(paramsToBeSerialized)
}
