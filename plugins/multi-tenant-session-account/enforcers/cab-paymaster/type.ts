import type { Address } from "viem"

export type RepayTokenInfo = {
    amount: bigint
    vault: Address
    chainId: bigint
}
