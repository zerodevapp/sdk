// Vendored from wevm/viem#5004 (src/eip8130/utils/actorChangeData.ts) at 7992598. Drop once viem ships `viem/eip8130`.
// viem-internal `*ErrorType` aliases removed; imports point at public viem entrypoints.
import {
    type Address,
    type Hex,
    decodeAbiParameters,
    encodeAbiParameters
} from "viem"
import { changeType } from "../constants.js"
import type { AaChange } from "../types/transaction.js"
/**
 * ABI parameters for an `authorizeActor` payload:
 * `abi.encode(bytes32 actorId, (address authenticator, uint48 expiry, uint16
 * scope) config, bytes policyData)`. The `config` tuple field order and widths
 * mirror `Keystore.ActorConfig`.
 */
const authorizePayloadParameters = [
    { name: "actorId", type: "bytes32" },
    {
        name: "config",
        type: "tuple",
        components: [
            { name: "authenticator", type: "address" },
            { name: "expiry", type: "uint48" },
            { name: "scope", type: "uint16" }
        ]
    },
    { name: "policyData", type: "bytes" }
] as const

/** ABI parameters for a `revokeActor` payload: `abi.encode(bytes32 actorId)`. */
const revokePayloadParameters = [{ name: "actorId", type: "bytes32" }] as const

/** ABI parameters for a `lock` payload: `abi.encode(uint16 unlockDelay)`. */
const lockPayloadParameters = [{ name: "unlockDelay", type: "uint16" }] as const

/**
 * Encodes the operation-specific `payload` of a `SignedAccountChanges` change
 * (mirrors `Keystore.AccountChange.payload`):
 *
 * - `authorizeActor` -> `abi.encode(bytes32 actorId, (address,uint48,uint16) config, bytes policyData)`
 * - `revokeActor` -> `abi.encode(bytes32 actorId)`
 * - `lock` -> `abi.encode(uint16 unlockDelay)`
 * - `incrementLocalEpoch` / `unlock` -> empty bytes (`0x`)
 *
 * @remarks
 * The `payload` is ABI-encoded (not RLP) so the same blob is decoded
 * identically by the native protocol and by
 * `Keystore.applySignedAccountChanges`. It is also the value hashed
 * (`keccak256(payload)`) into the batch signature digest (see
 * {@link hashAccountChanges}). Policy presence is the `SCOPE_POLICY` bit in
 * `scope`; `policyData` is empty unless that bit is set (then `manager (20) ||
 * commitment (32)`).
 */
export function encodeChangePayload(change: AaChange): Hex {
    if (change.changeType === changeType.authorizeActor)
        return encodeAbiParameters(authorizePayloadParameters, [
            change.actorId,
            {
                authenticator: change.authenticator,
                // `uint48` maps to `number` in viem's ABI encoder; expiry (unix seconds)
                // fits comfortably.
                expiry: Number(change.expiry ?? 0n),
                scope: change.scope ?? 0
            },
            change.policyData ?? "0x"
        ])
    if (change.changeType === changeType.revokeActor)
        return encodeAbiParameters(revokePayloadParameters, [change.actorId])
    if (change.changeType === changeType.lock)
        return encodeAbiParameters(lockPayloadParameters, [change.unlockDelay])
    // incrementLocalEpoch / unlock: empty payload.
    return "0x"
}

export type DecodedAuthorizeActorPayload = {
    actorId: Hex
    authenticator: Address
    scope: number
    expiry: bigint
    policyData: Hex
}

/** Decodes an `authorizeActor` `payload` produced by {@link encodeChangePayload}. */
export function decodeAuthorizeActorPayload(
    payload: Hex
): DecodedAuthorizeActorPayload {
    const [actorId, config, policyData] = decodeAbiParameters(
        authorizePayloadParameters,
        payload
    )
    return {
        actorId,
        authenticator: config.authenticator,
        scope: config.scope,
        expiry: BigInt(config.expiry),
        policyData
    }
}
