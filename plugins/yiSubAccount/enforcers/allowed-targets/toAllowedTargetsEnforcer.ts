import { concatHex, type Address } from "viem"
import type { Caveat } from "../../types.js"

export type AllowedTargetsEnforcerParams = {
    targets: Address[]
    enforcerAddress?: Address
}

export const AllowedTargetsEnforcerAddress =
    "0xF64D77B1f375AC43952865883360a4917353b72A"

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
