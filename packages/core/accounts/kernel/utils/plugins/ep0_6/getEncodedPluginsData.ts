import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint
} from "permissionless/types/entrypoint"
import { type Address, type Hex, concat, pad, toHex } from "viem"
import {
    type PluginValidityData,
    ValidatorMode
} from "../../../../../types/index.js"
import type { Kernel2_0_plugins } from "./getPluginsEnableTypedData.js"

export const getEncodedPluginsData = async <
    entryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V06_TYPE
>({
    accountAddress,
    enableSignature,
    action,
    validator,
    validUntil,
    validAfter
}: {
    accountAddress: Address
    enableSignature: Hex
} & Kernel2_0_plugins<entryPoint> &
    PluginValidityData) => {
    const enableData = await validator.getEnableData(accountAddress)
    const enableDataLength = enableData.length / 2 - 1
    return concat([
        ValidatorMode.enable,
        pad(toHex(validUntil, { size: 6 }), { size: 6 }), // 6 bytes 4 - 10
        pad(toHex(validAfter), { size: 6 }), // 6 bytes 10 - 16
        pad(validator.address, { size: 20 }), // 20 bytes 16 - 36
        pad(action.address, { size: 20 }), // 20 bytes 36 - 56
        pad(toHex(enableDataLength), { size: 32 }), // 32 bytes 56 - 88
        enableData, // 88 - 88 + enableData.length
        pad(toHex(enableSignature.length / 2 - 1), { size: 32 }), // 32 bytes 88 + enableData.length - 120 + enableData.length
        enableSignature // 120 + enableData.length - 120 + enableData.length + enableSignature.length
    ])
}
