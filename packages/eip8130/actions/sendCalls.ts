import type { Hash } from "viem"
import type { KernelEip8130BaseClient } from "../types.js"
import {
    type AaAccountChange,
    type AaCall,
    encodeWalletCalls,
    sendTransaction as sendEip8130Calls
} from "../vendor/eip8130/index.js"
import { sendSponsoredCalls } from "../vendor/eip8168/index.js"
import { estimateGas } from "./estimateGas.js"

export type SendCallsParameters = {
    /** Executed atomically as one phase. */
    calls: readonly AaCall[]
    /** Gas limit. Self-pay: estimated with 20% headroom when omitted. Sponsored: the payer's quote unless set. */
    gas?: bigint
    accountChanges?: readonly AaAccountChange[]
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
    nonceKey?: bigint
    nonceSequence?: bigint
    /** Upper validity bound (unix ms). */
    validBefore?: bigint
}

/**
 * Sends the calls as one EIP-8130 transaction from the Kernel. With a payer on
 * the client the transaction is quoted, co-signed and broadcast by the ERC-8168
 * payer service; otherwise the Kernel pays and broadcasts itself.
 */
export async function sendCalls(
    client: KernelEip8130BaseClient,
    { calls, gas, ...rest }: SendCallsParameters
): Promise<Hash> {
    const account = client.eip8130Account

    if (client.payer) {
        // The payer service takes the wire calls as-is, so realize ETH value
        // through Kernel `execute` up front (self-pay does this internally).
        const [wire] = encodeWalletCalls({
            account: account.address,
            calls: [calls],
            encodeExecute: account.encodeExecute
        })
        const result = await sendSponsoredCalls(client, {
            account,
            payerClient: client.payer,
            calls: wire,
            gas,
            ...rest
        })
        if (!("transactionHash" in result)) {
            throw new Error("Payer service did not broadcast the transaction")
        }
        return result.transactionHash
    }

    // ponytail: fixed 20% headroom over eth_estimateGas; pass `gas` to override
    const gasLimit =
        gas ??
        ((await estimateGas(client, {
            calls,
            accountChanges: rest.accountChanges
        })) *
            120n) /
            100n
    return sendEip8130Calls(client, {
        account,
        calls,
        gas: gasLimit,
        encodeExecute: account.encodeExecute,
        ...rest
    })
}
