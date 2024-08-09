import type { Address, Hex } from "viem"

export type DM_VERSION_TYPE = "1.0.0"

export type Caveat = {
    enforcer: Address
    args: Hex
    terms: Hex
}

export type Delegation = {
    delegate: Address
    delegator: Address
    authority: Hex
    caveats: Caveat[]
    salt: bigint
    signature: Hex
}
