import { type Address, concatHex } from "viem"
import type { Caveat } from "../../types.js"

export type AllowedTargetsEnforcerParams = {
    targets: Address[]
    enforcerAddress?: Address
}

export const AllowedTargetsEnforcerAddress =
    "0x518d39bC3F1598512Bd5D323e5e9228CC47732b4"

export function toAllowedTargetsEnforcer({
    targets,
    enforcerAddress = AllowedTargetsEnforcerAddress
}: AllowedTargetsEnforcerParams): Caveat {
    return {
        enforcer: enforcerAddress,
        terms: concatHex([...targets]),
        args: "0x"
    }
}
