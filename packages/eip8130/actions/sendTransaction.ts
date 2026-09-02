import type { Address, Hash, Hex } from "viem"
import type { KernelEip8130BaseClient } from "../types.js"
import { type SendCallsParameters, sendCalls } from "./sendCalls.js"

export type SendTransactionParameters = Omit<SendCallsParameters, "calls"> & {
    to: Address
    data?: Hex
    value?: bigint
}

/** Single-call convenience over {@link sendCalls}. Returns the EIP-8130 transaction hash. */
export function sendTransaction(
    client: KernelEip8130BaseClient,
    { to, data, value, ...rest }: SendTransactionParameters
): Promise<Hash> {
    return sendCalls(client, { calls: [{ to, data, value }], ...rest })
}
