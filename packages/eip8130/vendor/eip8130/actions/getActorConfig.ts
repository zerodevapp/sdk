// Vendored from wevm/viem#5004 (src/eip8130/actions/getActorConfig.ts) at 7992598. Drop once viem ships `viem/eip8130`.
// viem-internal `*ErrorType` aliases removed; imports point at public viem entrypoints.
import type { Account, Address, Chain, Client, Hex, Transport } from "viem"
import { readContract } from "viem/actions"
import { keystoreAbi } from "../abis.js"
import { actorScope, keystoreAddress } from "../constants.js"
export type GetActorConfigParameters = {
    /** The account whose actor to read. */
    account: Address
    /** The 32-byte actor identifier (see `key.*(...).actorId`). */
    actorId: Hex
}

export type GetActorConfigReturnType = {
    /** Authenticator contract address (or protocol sentinel) for the actor. */
    authenticator: Address
    /** Permission bitmask (see `actorScope`). `0` = unrestricted. */
    scope: number
    /** Actor expiry (unix seconds). `0` = no expiry. */
    expiry: number
    /** Whether the actor is policy-gated (derived from the `SCOPE_POLICY` bit in `scope`). */
    hasPolicy: boolean
}

/**
 * Reads an actor's configuration (authenticator, scope, expiry, policy type)
 * from the `Keystore` system contract (`getActorConfig`). Use it to
 * inspect owners / session keys, e.g. to enrich a "sign with" picker.
 *
 * @example
 * ```ts
 * *
 * const config = await getActorConfig(client, {
 *   account: account.address,
 *   actorId: key.p256({ x, y }).actorId,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The actor's configuration.
 */
export async function getActorConfig<
    chain extends Chain | undefined,
    account extends Account | undefined
>(
    client: Client<Transport, chain, account>,
    parameters: GetActorConfigParameters
): Promise<GetActorConfigReturnType> {
    const { account, actorId } = parameters

    const config = await readContract(client, {
        address: keystoreAddress,
        abi: keystoreAbi,
        functionName: "getActorConfig",
        args: [account, actorId]
    })

    return {
        authenticator: config.authenticator,
        scope: config.scope,
        expiry: config.expiry,
        hasPolicy: (config.scope & actorScope.policy) !== 0
    }
}
