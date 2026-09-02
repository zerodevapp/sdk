import type { KERNEL_VERSION_TYPE } from "@zerodev/sdk/types"
import type { Address } from "viem"
import type { KernelEip8130Account, KernelEip8130Actor } from "../types.js"
import { kernelEncodeExecute } from "../utils/kernelEncodeExecute.js"
import { toAccount } from "../vendor/eip8130/index.js"

export type ToKernelEip8130AccountParameters = {
    /** The Kernel to drive: `createKernelAccount(...)` / `create7702KernelAccount(...)` result, or `{ address, kernelVersion }`. */
    kernelAccount: { address: Address; kernelVersion: KERNEL_VERSION_TYPE }
    /** The actor signing for this Kernel (see `signerToEip8130Actor`, `webAuthnKeyToEip8130Actor`). */
    actor: KernelEip8130Actor
}

/**
 * Adapts an existing (or counterfactual) Kernel to a viem EIP-8130 account at
 * the same address. Only the address, the actor's signing, and Kernel's
 * execution encoding live here; deployment and import stay on the 4337 client.
 */
export function toKernelEip8130Account({
    kernelAccount,
    actor
}: ToKernelEip8130AccountParameters): KernelEip8130Account {
    const account = toAccount({
        address: kernelAccount.address,
        signer: actor.signer,
        authenticator: actor.authenticator,
        actorId: actor.actorId
    })
    return {
        ...account,
        kernelVersion: kernelAccount.kernelVersion,
        actor,
        encodeExecute: kernelEncodeExecute(kernelAccount.kernelVersion)
    }
}
