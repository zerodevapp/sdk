import { type Address, type Hex, isAddressEqual, parseEventLogs } from "viem"
import { entryPoint07Abi } from "viem/account-abstraction"
import { getPublicClient } from "./clients"
import type { ChainKey } from "./env"

// A bundle transaction can succeed while the op inside it failed; the
// EntryPoint's UserOperationEvent carries the op's own result.
export async function userOpSucceeded(
    key: ChainKey,
    txHash: Hex,
    sender: Address
): Promise<boolean> {
    const receipt = await getPublicClient(key).getTransactionReceipt({
        hash: txHash
    })
    const events = parseEventLogs({
        abi: entryPoint07Abi,
        eventName: "UserOperationEvent",
        logs: receipt.logs
    }).filter((e) => isAddressEqual(e.args.sender, sender))
    if (events.length !== 1) {
        throw new Error(
            `expected 1 UserOperationEvent for ${sender}, got ${events.length}`
        )
    }
    return events[0].args.success
}
