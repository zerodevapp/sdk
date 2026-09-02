import type { KERNEL_VERSION_TYPE } from "@zerodev/sdk/types"
import type {
    AaActor,
    EncodeExecute,
    GetActorConfigReturnType,
    Signer,
    ToAccountReturnType
} from "./vendor/eip8130/index.js"

/**
 * An EIP-8130 actor: the on-chain identity (`actorId` + `authenticator`) plus
 * the signer that produces its auth blobs.
 */
export type KernelEip8130Actor = AaActor & { signer: Signer }

/**
 * A Kernel address driven over EIP-8130. Wraps viem's 8130 account (signing,
 * account changes) with the Kernel-specific execution encoding.
 */
export type KernelEip8130Account = ToAccountReturnType & {
    kernelVersion: KERNEL_VERSION_TYPE
    actor: KernelEip8130Actor
    /** Encodes a value-bearing phase as a Kernel `execute` self-call (see viem `encodeWalletCalls`). */
    encodeExecute: EncodeExecute
}

export type KernelEip8130Status =
    /** No Keystore on this chain. */
    | { status: "unsupported" }
    /** Kernel exists but has not been imported into the Keystore. */
    | { status: "not-imported" }
    /** Imported, but this account's actor is not (or no longer) authorized. */
    | { status: "actor-inactive" }
    | { status: "ready"; actor: GetActorConfigReturnType }
