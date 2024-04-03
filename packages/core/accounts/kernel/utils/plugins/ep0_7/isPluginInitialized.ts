import { getAction } from "permissionless"
import type { Address, Client } from "viem"
import { readContract } from "viem/actions"
import { KernelModuleIsInitializedAbi } from "../../../abi/kernel_v_3_0_0/KernelModuleAbi.js"

export const isPluginInitialized = async (
    client: Client,
    accountAddress: Address,
    pluginAddress: Address
) => {
    try {
        return await getAction(
            client,
            readContract
        )({
            abi: KernelModuleIsInitializedAbi,
            address: pluginAddress,
            functionName: "isInitialized",
            args: [accountAddress]
        })
    } catch (error) {}
    return false
}
