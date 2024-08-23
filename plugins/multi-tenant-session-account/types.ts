import type { Address, Hex } from "viem"

export type DM_VERSION_TYPE = "1.0.0"

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type Caveat<T = any> = {
    enforcer: Address
    args: Hex
    getArgs: (params: T) => Hex
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
