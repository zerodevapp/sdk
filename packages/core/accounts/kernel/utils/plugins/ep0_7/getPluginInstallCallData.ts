import { type Address, encodeFunctionData } from "viem"
import type { PluginMigrationData } from "../../../../../types/kernel.js"
import { KernelModuleInstallAbi } from "../../../abi/kernel_v_3_0_0/KernelModuleAbi.js"
import type { CallArgs } from "../../types.js"

export const getPluginInstallCallData = (
    accountAddress: Address,
    plugin: PluginMigrationData
): CallArgs => {
    const data = encodeFunctionData({
        abi: KernelModuleInstallAbi,
        functionName: "installModule",
        args: [plugin.type, plugin.address, plugin.data]
    })
    return {
        to: accountAddress,
        data
    }
}
