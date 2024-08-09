import type { Address, Hex } from "viem"

export type YI_SUB_ACCOUNT_VERSION_TYPE = "0.0.1"
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
