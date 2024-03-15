import { Buffer } from "buffer"
import { startAuthentication, startRegistration } from "@simplewebauthn/browser"
import { type WebAuthnKey } from "./toWebAuthnSigner.js"

export enum WebAuthnMode {
    Register = "register",
    Login = "login"
}

export const toWebAuthnPubKey = async ({
    passkeyName,
    passkeyServerUrl,
    mode = WebAuthnMode.Login
}: {
    passkeyName: string
    passkeyServerUrl: string
    mode: WebAuthnMode
}): Promise<WebAuthnKey> => {
    let pubKey: string | undefined
    if (mode === WebAuthnMode.Login) {
        // Get login options
        const loginOptionsResponse = await fetch(
            `${passkeyServerUrl}/login/options`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include"
            }
        )
        const loginOptions = await loginOptionsResponse.json()

        // Start authentication (login)
        const loginCred = await startAuthentication(loginOptions)

        // Verify authentication
        const loginVerifyResponse = await fetch(
            `${passkeyServerUrl}/login/verify`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cred: loginCred }),
                credentials: "include"
            }
        )

        const loginVerifyResult = await loginVerifyResponse.json()

        if (window.sessionStorage === undefined) {
            throw new Error("sessionStorage is not available")
        }
        sessionStorage.setItem("userId", loginVerifyResult.userId)

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
        const registerOptionsResponse = await fetch(
            `${passkeyServerUrl}/register/options`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username: passkeyName }),
                credentials: "include"
            }
        )
        const registerOptions = await registerOptionsResponse.json()

        // save userId to sessionStorage
        if (window.sessionStorage === undefined) {
            throw new Error("sessionStorage is not available")
        }
        sessionStorage.setItem("userId", registerOptions.userId)

        // Start registration
        const registerCred = await startRegistration(registerOptions.options)

        // Verify registration
        const registerVerifyResponse = await fetch(
            `${passkeyServerUrl}/register/verify`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: registerOptions.userId,
                    username: passkeyName,
                    cred: registerCred
                }),
                credentials: "include"
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
