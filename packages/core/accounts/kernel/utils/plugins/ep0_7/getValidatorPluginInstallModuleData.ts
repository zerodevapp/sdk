import {
    type RequiredBy,
    concatHex,
    encodeAbiParameters,
    parseAbiParameters,
    zeroAddress
} from "viem"
import { PLUGIN_TYPE } from "../../../../../constants.js"
import type {
    KernelValidator,
    PluginMigrationData
} from "../../../../../types/index.js"
import type {
    Action,
    EntryPointType,
    GetKernelVersion,
    KernelValidatorHook
} from "../../../../../types/kernel.js"
import { satisfiesRange } from "../../../../../utils.js"
import { getActionSelector } from "../../common/getActionSelector.js"

export const getValidatorPluginInstallModuleData = async <
    TEntryPointVersion extends "0.7" | "0.8"
>({
    plugin,
    entryPoint,
    kernelVersion,
    hook,
    action
}: {
    plugin: RequiredBy<Partial<KernelValidator>, "address" | "getEnableData">
    entryPoint: EntryPointType<TEntryPointVersion>
    kernelVersion: GetKernelVersion<TEntryPointVersion>
    hook?: KernelValidatorHook
    action?: Pick<Action, "selector">
}): Promise<PluginMigrationData> => {
    if (!satisfiesRange(kernelVersion, ">0.3.0")) {
        throw new Error("Kernel version must be greater than 0.3.0")
    }
    return {
        type: PLUGIN_TYPE.VALIDATOR,
        address: plugin.address,
        data: concatHex([
            hook?.getIdentifier() ?? zeroAddress,
            encodeAbiParameters(
                parseAbiParameters(
                    "bytes validatorData, bytes hookData, bytes selectorData"
                ),
                [
                    await plugin.getEnableData(),
                    (await hook?.getEnableData()) ?? "0x",
                    action?.selector ?? getActionSelector(entryPoint.version)
                ]
            )
        ])
    }
}
