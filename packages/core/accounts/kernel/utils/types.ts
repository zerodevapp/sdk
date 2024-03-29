import type { Address, Hex } from "viem"

export type CallArgs = {
    to: Address
    data: Hex
    value: bigint
}
export type DelegateCallArgs = Omit<CallArgs, "value">
