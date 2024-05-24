import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless"
import type { ZeroDevVersion } from "../types"

export const getEntryPointFromZeroDevVersion = (version: ZeroDevVersion) => {
    if (version === "v2") {
        return ENTRYPOINT_ADDRESS_V06
    }
    return ENTRYPOINT_ADDRESS_V07
}
