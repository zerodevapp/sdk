import {
    type Chain,
    type Client,
    type Prettify,
    type Transport,
    createClient
} from "viem"
import type { KernelEip8130Account } from "../types.js"
import type { PayerClient } from "../vendor/eip8168/index.js"
import {
    type KernelEip8130Actions,
    kernelEip8130Actions
} from "./decorators/eip8130.js"

export type KernelEip8130ClientConfig<
    transport extends Transport = Transport,
    chain extends Chain = Chain
> = {
    account: KernelEip8130Account
    /** An EIP-8130 chain. */
    chain: chain
    /** Execution RPC of that chain (the same node serves reads, estimates and `eth_sendRawTransaction`). */
    transport: transport
    /** ERC-8168 payer service (`createPayerClient` from this package's vendored ERC-8168 implementation). Omit to have the Kernel pay its own gas. */
    payer?: PayerClient
    key?: string
    name?: string
    pollingInterval?: number
}

export type KernelEip8130Client<
    transport extends Transport = Transport,
    chain extends Chain = Chain
> = Prettify<
    Client<
        transport,
        chain,
        undefined,
        undefined,
        KernelEip8130Actions & {
            eip8130Account: KernelEip8130Account
            payer: PayerClient | undefined
        }
    >
>

/**
 * Client for driving a Kernel over EIP-8130. Kept apart from the 4337
 * `KernelAccountClient`: different transport (execution RPC vs bundler),
 * different sponsorship (ERC-8168 payer vs paymaster), no UserOperations.
 */
export function createKernelEip8130Client<
    transport extends Transport,
    chain extends Chain
>(
    config: KernelEip8130ClientConfig<transport, chain>
): KernelEip8130Client<transport, chain> {
    const {
        account,
        payer,
        key = "eip8130",
        name = "Kernel EIP-8130 Client",
        ...rest
    } = config
    // Assigned in place (not spread) so viem's `extend` closure keeps seeing
    // these properties. `extend` is not used for the actions themselves: it
    // type-guards viem's own action names (`estimateGas`, `sendTransaction`,
    // `writeContract`) against viem's signatures, and the 8130 shapes differ.
    const client = Object.assign(
        createClient({ ...rest, key, name, type: "kernelEip8130Client" }),
        { eip8130Account: account, payer }
    )
    return Object.assign(
        client,
        kernelEip8130Actions()(client)
    ) as unknown as KernelEip8130Client<transport, chain>
}
