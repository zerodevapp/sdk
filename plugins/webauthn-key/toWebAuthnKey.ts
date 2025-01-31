import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/types"
import {
    type Hex,
    type SignableMessage,
    concatHex,
    keccak256,
    pad,
    toHex
} from "viem"
import { b64ToBytes, uint8ArrayToHexString } from "./utils.js"

export enum WebAuthnMode {
    Register = "register",
    Login = "login"
}

export type WebAuthnKey = {
    pubX: bigint
    pubY: bigint
    authenticatorId: string
    authenticatorIdHash: Hex
    rpID: string
    signMessageCallback?: (
        message: SignableMessage,
        rpId: string,
        chainId: number,
        allowCredentials?: PublicKeyCredentialRequestOptionsJSON["allowCredentials"]
    ) => Promise<Hex>
}

interface BaseParams {
    mode?: WebAuthnMode
    credentials?: RequestCredentials
    passkeyServerHeaders?: Record<string, string>
    useRN?: boolean
}

export interface ParamsWithKey extends BaseParams {
    webAuthnKey: WebAuthnKey
    rpID: string
    passkeyName?: string
    passkeyServerUrl?: string
}

export interface ParamsWithoutKey extends BaseParams {
    webAuthnKey?: undefined
    rpID?: string
    passkeyName: string
    passkeyServerUrl: string
}

export type WebAuthnAccountParams = ParamsWithKey | ParamsWithoutKey

export const encodeWebAuthnPubKey = (pubKey: WebAuthnKey) => {
    return concatHex([
        toHex(pubKey.pubX, { size: 32 }),
        toHex(pubKey.pubY, { size: 32 }),
        pad(pubKey.authenticatorIdHash, { size: 32 })
    ])
}

export const toWebAuthnKey = async ({
    webAuthnKey,
    rpID,
    passkeyName,
    passkeyServerUrl,
    mode = WebAuthnMode.Register,
    credentials = "include",
    passkeyServerHeaders = {}
}: WebAuthnAccountParams): Promise<WebAuthnKey> => {
    if (webAuthnKey) {
        return webAuthnKey
    }
    let pubKey: string | undefined
    let authenticatorId: string | undefined
    if (mode === WebAuthnMode.Login) {
        // Get login options
        const loginOptionsResponse = await fetch(
            `${passkeyServerUrl}/login/options`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...passkeyServerHeaders
                },
                body: JSON.stringify({ rpID }),
                credentials
            }
        )
        const loginOptions = await loginOptionsResponse.json()

        // Start authentication (login)
        const { startAuthentication } = await import("@simplewebauthn/browser")
        const loginCred = await startAuthentication(loginOptions)

        authenticatorId = loginCred.id

        // Verify authentication
        const loginVerifyResponse = await fetch(
            `${passkeyServerUrl}/login/verify`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...passkeyServerHeaders
                },
                body: JSON.stringify({ cred: loginCred, rpID }),
                credentials
            }
        )

        const loginVerifyResult = await loginVerifyResponse.json()

        if (!loginVerifyResult.verification.verified) {
            throw new Error("Login not verified")
        }
        // Import the key
        pubKey = loginVerifyResult.pubkey // Uint8Array pubkey
    } else {
        // Get registration options
        const registerOptionsResponse = await fetch(
            `${passkeyServerUrl}/register/options`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...passkeyServerHeaders
                },
                body: JSON.stringify({ username: passkeyName, rpID }),
                credentials
            }
        )
        const registerOptions = await registerOptionsResponse.json()

        // Start registration
        const { startRegistration } = await import("@simplewebauthn/browser")
        const registerCred = await startRegistration(registerOptions.options)

        authenticatorId = registerCred.id

        // Verify registration
        const registerVerifyResponse = await fetch(
            `${passkeyServerUrl}/register/verify`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...passkeyServerHeaders
                },
                body: JSON.stringify({
                    userId: registerOptions.userId,
                    username: passkeyName,
                    cred: registerCred,
                    rpID
                }),
                credentials
            }
        )

        const registerVerifyResult = await registerVerifyResponse.json()
        if (!registerVerifyResult.verified) {
            throw new Error("Registration not verified")
        }

        // Import the key
        pubKey = registerCred.response.publicKey
    }

    if (!pubKey) {
        throw new Error("No public key returned from registration credential")
    }
    if (!authenticatorId) {
        throw new Error(
            "No authenticator id returned from registration credential"
        )
    }

    const authenticatorIdHash = keccak256(
        uint8ArrayToHexString(b64ToBytes(authenticatorId))
    )
    const spkiDer = Buffer.from(pubKey, "base64")
    const key = await crypto.subtle.importKey(
        "spki",
        spkiDer,
        {
            name: "ECDSA",
            namedCurve: "P-256"
        },
        true,
        ["verify"]
    )

    // Export the key to the raw format
    const rawKey = await crypto.subtle.exportKey("raw", key)
    const rawKeyBuffer = Buffer.from(rawKey)

    // The first byte is 0x04 (uncompressed), followed by x and y coordinates (32 bytes each for P-256)
    const pubKeyX = rawKeyBuffer.subarray(1, 33).toString("hex")
    const pubKeyY = rawKeyBuffer.subarray(33).toString("hex")

    return {
        pubX: BigInt(`0x${pubKeyX}`),
        pubY: BigInt(`0x${pubKeyY}`),
        authenticatorId,
        authenticatorIdHash,
        rpID: "" // unused because we don't need it for the signMessageCallback
    }
}
