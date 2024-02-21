import { Buffer } from "buffer"
import { startAuthentication, startRegistration } from "@simplewebauthn/browser"
import { type WebAuthnKey } from "./toWebAuthnSigner.js"

export enum WebAuthnMode {
    Register = "register",
    Login = "login"
}

export const toWebAuthnPubKey = async ({
    passkeyName,
    registerOptionUrl,
    registerVerifyUrl,
    loginOptionUrl,
    loginVerifyUrl,
    mode = WebAuthnMode.Login
}: {
    passkeyName: string
    registerOptionUrl: string
    registerVerifyUrl: string
    loginOptionUrl: string
    loginVerifyUrl: string
    mode: WebAuthnMode
}): Promise<WebAuthnKey> => {
    let pubKey: string | undefined
    if (mode === WebAuthnMode.Login) {
        // Get login options
        const loginOptionsResponse = await fetch(loginOptionUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include"
        })
        const loginOptions = await loginOptionsResponse.json()

        // Start authentication (login)
        const loginCred = await startAuthentication(loginOptions)

        // Verify authentication
        const loginVerifyResponse = await fetch(loginVerifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cred: loginCred }),
            credentials: "include"
        })

        const loginVerifyResult = await loginVerifyResponse.json()
        if (!loginVerifyResult.verification.verified) {
            throw new Error("Login not verified")
        }
        // Import the key
        pubKey = loginVerifyResult.pubkey // Uint8Array pubkey
    } else {
        if (!passkeyName) {
            throw new Error("No passkey name provided")
        }
        // Get registration options
        const registerOptionsResponse = await fetch(registerOptionUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username: passkeyName }),
            credentials: "include"
        })
        const registerOptions = await registerOptionsResponse.json()

        // Start registration
        const registerCred = await startRegistration(registerOptions)

        // Verify registration
        const registerVerifyResponse = await fetch(registerVerifyUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username: passkeyName, cred: registerCred }),
            credentials: "include"
        })

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
        pubY: BigInt(`0x${pubKeyY}`)
    }
}
