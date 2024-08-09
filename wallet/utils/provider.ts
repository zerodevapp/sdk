import { KERNEL_V2_4, KERNEL_V3_0, KERNEL_V3_1 } from "@zerodev/sdk/constants"
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless"
import type { ZeroDevVersion } from "../types"

export const getEntryPointFromZeroDevVersion = (version: ZeroDevVersion) => {
    if (version === "v3" || version === "v3.1") {
        return ENTRYPOINT_ADDRESS_V07
    }
    return ENTRYPOINT_ADDRESS_V06
}

export const getKernelVersionFromZeroDevVersion = (version: ZeroDevVersion) => {
    if (version === "v3") {
        return KERNEL_V3_0
    } else if (version === "v3.1") {
        return KERNEL_V3_1
    }
    return KERNEL_V2_4
}
