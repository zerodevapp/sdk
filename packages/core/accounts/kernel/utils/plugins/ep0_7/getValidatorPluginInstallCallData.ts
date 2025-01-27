import {
    type Address,
    type Hex,
    concatHex,
    encodeFunctionData,
    zeroAddress
} from "viem"
import { VALIDATOR_TYPE } from "../../../../../constants.js"
import type { PluginMigrationData } from "../../../../../types/kernel.js"
import { KernelV3_1AccountAbi } from "../../../abi/kernel_v_3_1/KernelAccountAbi.js"
import type { CallArgs } from "../../types.js"

export const getValidatorPluginInstallCallData = (
    accountAddress: Address,
    plugin: PluginMigrationData,
    nonce: number
): CallArgs => {
    const vIds = [concatHex([VALIDATOR_TYPE.SECONDARY, plugin.address])]
    const configs = [{ nonce, hook: zeroAddress }]
    const validationData = [plugin.data]
    const hookData: Hex[] = ["0x"]
    const data = encodeFunctionData({
        abi: KernelV3_1AccountAbi,
        functionName: "installValidations",
        args: [vIds, configs, validationData, hookData]
    })
    return {
        to: accountAddress,
        data
    }
}
