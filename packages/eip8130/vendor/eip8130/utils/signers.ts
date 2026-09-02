// Vendored from wevm/viem#5004 (src/eip8130/utils/signers.ts) at 7992598. Drop once viem ships `viem/eip8130`. `toP256Signer` removed (unused; avoids an `ox` dependency).
// viem-internal `*ErrorType` aliases removed; imports point at public viem entrypoints.
import {
    type Address,
    type Hex,
    encodeAbiParameters,
    size,
    sliceHex,
    zeroAddress
} from "viem"
import { canonicalAuthenticators } from "../constants.js"
import type { Signer } from "./signTransaction.js"
function publicKeyToXY(publicKey: Hex | { x: Hex; y: Hex }): {
    x: Hex
    y: Hex
} {
    if (typeof publicKey !== "string") return publicKey
    // Accept an uncompressed key with or without the 0x04 prefix.
    const body = size(publicKey) === 65 ? sliceHex(publicKey, 1) : publicKey
    if (size(body) !== 64)
        throw new Error(
            "`publicKey` must be a 64-byte `x || y` hex (optionally 0x04-prefixed) or `{ x, y }`."
        )
    return { x: sliceHex(body, 0, 32), y: sliceHex(body, 32, 64) }
}

/** WebAuthn assertion metadata, as returned by viem's `toWebAuthnAccount`. */
export type WebAuthnSignSource = {
    /** Credential public key: 64-byte `x || y` hex, or `{ x, y }`. */
    publicKey: Hex | { x: Hex; y: Hex }
    /**
     * Produces a WebAuthn assertion over `hash`. Structurally compatible with the
     * `sign` of viem's `toWebAuthnAccount` (`viem/account-abstraction`).
     */
    sign: (parameters: { hash: Hex }) => Promise<{
        /** secp256r1 signature, `r || s` (64 bytes). */
        signature: Hex
        webauthn: {
            authenticatorData: Hex
            clientDataJSON: string
            challengeIndex: number
            typeIndex: number
        }
    }>
}

const webAuthnAuthParameters = [
    {
        type: "tuple",
        components: [
            { name: "r", type: "bytes32" },
            { name: "s", type: "bytes32" },
            { name: "challengeIndex", type: "uint256" },
            { name: "typeIndex", type: "uint256" },
            { name: "authenticatorData", type: "bytes" },
            { name: "clientDataJSON", type: "string" }
        ]
    },
    { name: "x", type: "bytes32" },
    { name: "y", type: "bytes32" }
] as const

export type ToWebAuthnSignerParameters = {
    /**
     * Authenticator address that validates this passkey. Defaults to the canonical
     * WebAuthn/passkey authenticator.
     */
    authenticator?: Address | undefined
    /** Placeholder `Signer.address` (passkeys have no EVM address). */
    address?: Address | undefined
}

/**
 * Builds a {@link Signer} for a WebAuthn (passkey / FIDO2) configured actor. The
 * signer's `sign` runs the assertion and ABI-encodes the WebAuthn authenticator
 * `data` (`(WebAuthnAuth, x, y)`), carrying the passkey `authenticator`.
 *
 * @example
 * * *
 * const credential = await createWebAuthnCredential({ name: 'vibes' })
 * const signer = toWebAuthnSigner(toWebAuthnAccount({ credential }))
 * const account = toAccount({
 *   signer,
 *   authenticator: signer.authenticator,
 *   userSalt,
 *   code,
 *   initialActors: [key.passkey(signer.publicKey)],
 * })
 */
export function toWebAuthnSigner(
    source: WebAuthnSignSource,
    parameters: ToWebAuthnSignerParameters = {}
): Signer & { publicKey: { x: Hex; y: Hex } } {
    const authenticator =
        parameters.authenticator ?? canonicalAuthenticators.passkey
    const { x, y } = publicKeyToXY(source.publicKey)

    return {
        address: parameters.address ?? zeroAddress,
        authenticator,
        publicKey: { x, y },
        async sign({ hash }) {
            const { signature, webauthn } = await source.sign({ hash })
            const r = sliceHex(signature, 0, 32)
            const s = sliceHex(signature, 32, 64)
            return encodeAbiParameters(webAuthnAuthParameters, [
                {
                    r,
                    s,
                    challengeIndex: BigInt(webauthn.challengeIndex),
                    typeIndex: BigInt(webauthn.typeIndex),
                    authenticatorData: webauthn.authenticatorData,
                    clientDataJSON: webauthn.clientDataJSON
                },
                x,
                y
            ])
        }
    }
}
