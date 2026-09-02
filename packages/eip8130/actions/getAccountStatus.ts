import { type BaseError, zeroAddress } from "viem"
import type { KernelEip8130BaseClient, KernelEip8130Status } from "../types.js"
import {
    type GetActorConfigReturnType,
    getActorConfig,
    getConfigSequence
} from "../vendor/eip8130/index.js"

/** `eth_call` to the Keystore returned no data: nothing is deployed there. */
const isNoKeystore = (error: unknown) =>
    typeof (error as BaseError).walk === "function" &&
    !!(error as BaseError).walk(
        (e) => (e as Error).name === "ContractFunctionZeroDataError"
    )

/**
 * Where this Kernel stands on the EIP-8130 chain: no Keystore, not yet
 * imported, imported but this actor is not authorized, or ready to send.
 *
 * The actor's Keystore configuration decides the status: a live actor is
 * `ready` in a single read. Only a non-live actor needs the change sequences
 * (the spec's initialized flag: create/import set `localSequence = 1`) to tell
 * "never imported" from "imported, but this actor is missing/revoked/expired".
 */
export async function getAccountStatus(
    client: KernelEip8130BaseClient
): Promise<KernelEip8130Status> {
    const { address, actorId } = client.eip8130Account
    if (!actorId) throw new Error("EIP-8130 account has no actorId")

    let actor: GetActorConfigReturnType
    try {
        actor = await getActorConfig(client, { account: address, actorId })
    } catch (error) {
        if (isNoKeystore(error)) return { status: "unsupported" }
        throw error
    }
    if (actor.authenticator !== zeroAddress) return { status: "ready", actor }

    const { multichain, localEpoch, localSequence } = await getConfigSequence(
        client,
        { account: address }
    )
    const initialized =
        multichain !== 0n || localEpoch !== 0 || localSequence !== 0
    return { status: initialized ? "actor-inactive" : "not-imported" }
}
