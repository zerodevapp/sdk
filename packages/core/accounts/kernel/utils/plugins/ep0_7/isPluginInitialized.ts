import type { Address, Client } from "viem"
import { readContract } from "viem/actions"
import { getAction } from "viem/utils"
import { KernelModuleIsInitializedAbi } from "../../../abi/kernel_v_3_0_0/KernelModuleAbi.js"

export const isPluginInitialized = async (
    client: Client,
    accountAddress: Address,
    pluginAddress: Address
) => {
    try {
        return await getAction(
            client,
            readContract,
            "readContract"
        )({
            abi: KernelModuleIsInitializedAbi,
            address: pluginAddress,
            functionName: "isInitialized",
            args: [accountAddress]
        })
    } catch (error) {}
    return false
}
