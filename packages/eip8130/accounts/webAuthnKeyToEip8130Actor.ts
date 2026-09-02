import { type Address, concatHex, toHex } from "viem"
import {
    type ToWebAuthnAccountParameters,
    type WebAuthnAccount,
    toWebAuthnAccount
} from "viem/account-abstraction"
import type { KernelEip8130Actor } from "../types.js"
import {
    type WebAuthnSignSource,
    key,
    toWebAuthnSigner
} from "../vendor/eip8130/index.js"

export type WebAuthnKeyToEip8130ActorParameters = {
    /** The passkey as returned by `toWebAuthnKey` (@zerodev/webauthn-key); typed structurally so this package does not depend on it. */
    webAuthnKey: {
        pubX: bigint
        pubY: bigint
        /** Credential id (base64url). */
        authenticatorId: string
        rpID: string
    }
    /** Credential request function for non-browser environments (React Native, tests). Defaults to `navigator.credentials.get`. */
    getFn?: ToWebAuthnAccountParameters["getFn"]
    /** WebAuthn authenticator contract override. Defaults to the canonical passkey authenticator. */
    authenticator?: Address
}

/**
 * Passkey actor for the same credential a Kernel passkey validator uses. The
 * assertion is taken over the raw EIP-8130 signature hash through viem's
 * WebAuthn account, then ABI-encoded for the passkey authenticator.
 */
export function webAuthnKeyToEip8130Actor({
    webAuthnKey,
    getFn,
    authenticator
}: WebAuthnKeyToEip8130ActorParameters): KernelEip8130Actor {
    const publicKey = {
        x: toHex(webAuthnKey.pubX, { size: 32 }),
        y: toHex(webAuthnKey.pubY, { size: 32 })
    }
    const account = toWebAuthnAccount({
        credential: {
            id: webAuthnKey.authenticatorId,
            publicKey: concatHex([publicKey.x, publicKey.y])
        },
        rpId: webAuthnKey.rpID,
        getFn
    })
    const signer = toWebAuthnSigner(toWebAuthnSignSource(account), {
        authenticator
    })
    return { ...key.webAuthn(publicKey, { authenticator }), signer }
}

/**
 * Adapts a viem WebAuthn account to viem's 8130 `WebAuthnSignSource`. Newer
 * `ox` types the assertion's `challengeIndex` / `typeIndex` as optional; the
 * passkey authenticator needs them, and they are by definition these offsets
 * into `clientDataJSON`.
 */
export function toWebAuthnSignSource(
    account: Pick<WebAuthnAccount, "publicKey" | "sign">
): WebAuthnSignSource {
    return {
        publicKey: account.publicKey,
        async sign({ hash }) {
            const { signature, webauthn } = await account.sign({ hash })
            return {
                signature,
                webauthn: {
                    ...webauthn,
                    challengeIndex:
                        webauthn.challengeIndex ??
                        webauthn.clientDataJSON.indexOf('"challenge"'),
                    typeIndex:
                        webauthn.typeIndex ??
                        webauthn.clientDataJSON.indexOf('"type"')
                }
            }
        }
    }
}
