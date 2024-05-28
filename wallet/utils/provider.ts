import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless"
import type { ZeroDevVersion } from "../types"

export const getEntryPointFromZeroDevVersion = (version: ZeroDevVersion) => {
    if (version === "v3") {
        return ENTRYPOINT_ADDRESS_V07
    }
    return ENTRYPOINT_ADDRESS_V06
}
