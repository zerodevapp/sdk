import type { KernelSmartAccount } from "@zerodev/sdk"
import type { EntryPoint } from "permissionless/types"
import type { Hex } from "viem"
import {
    isPermissionValidatorPlugin,
    serializePermissionAccountParams
} from "./utils.js"

export const serializePermissionAccount = async <entryPoint extends EntryPoint>(
    account: KernelSmartAccount<entryPoint>,
    privateKey?: Hex
): Promise<string> => {
    if (!isPermissionValidatorPlugin(account.kernelPluginManager))
        throw new Error("Account plugin is not a permission validator")
    const permissionParams =
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
        permissionParams,
        action,
        validityData,
        accountParams,
        enableSignature,
        privateKey
    }

    return serializePermissionAccountParams(paramsToBeSerialized)
}
