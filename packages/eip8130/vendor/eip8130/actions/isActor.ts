// Vendored from wevm/viem#5004 (src/eip8130/actions/isActor.ts) at 7992598. Drop once viem ships `viem/eip8130`.
// viem-internal `*ErrorType` aliases removed; imports point at public viem entrypoints.
import {
    type Account,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    zeroAddress
} from "viem"
import { getActorConfig } from "./getActorConfig.js"
export type IsActorParameters = {
    /** The account to check. */
    account: Address
    /** The 32-byte actor identifier (see `key.*(...).actorId`). */
    actorId: Hex
}

export type IsActorReturnType = boolean

/**
 * Reads whether an actor is currently authorized on an EIP-8130 account.
 *
 * The finalized Keystore system contract has no dedicated `isActor` view; actor
 * liveness is derived from {@link getActorConfig}, whose single resolver returns
 * the all-zero config (authenticator `0x0`) for any actor that is unknown,
 * revoked, disabled, or expired — and never reverts (including for an account
 * that has not been created yet). "Bound" therefore means a non-zero
 * authenticator. For the actor's full configuration, use {@link getActorConfig}.
 *
 * @example
 * ```ts
 * *
 * const authorized = await isActor(client, {
 *   account: account.address,
 *   actorId: key.p256({ x, y }).actorId,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns Whether the actor is authorized.
 */
export async function isActor<
    chain extends Chain | undefined,
    account extends Account | undefined
>(
    client: Client<Transport, chain, account>,
    parameters: IsActorParameters
): Promise<IsActorReturnType> {
    const { account, actorId } = parameters

    const { authenticator } = await getActorConfig(client, {
        account,
        actorId
    })
    return authenticator !== zeroAddress
}
