import { describe, expect, test } from "bun:test"
import { concatHex, keccak256, toHex } from "viem"
import {
    toWebAuthnSignSource,
    webAuthnKeyToEip8130Actor
} from "./accounts/webAuthnKeyToEip8130Actor.js"
import { canonicalAuthenticators } from "./vendor/eip8130/index.js"

const webAuthnKey = {
    pubX: 1234n,
    pubY: 5678n,
    authenticatorId: "credential-id",
    rpID: "example.com"
}

describe("webAuthnKeyToEip8130Actor", () => {
    test("derives the passkey actor from the credential's public key", () => {
        const actor = webAuthnKeyToEip8130Actor({ webAuthnKey })
        const x = toHex(1234n, { size: 32 })
        const y = toHex(5678n, { size: 32 })
        expect(actor.actorId).toBe(keccak256(concatHex([x, y])))
        expect(actor.authenticator).toBe(canonicalAuthenticators.passkey)
        expect(actor.signer.authenticator).toBe(canonicalAuthenticators.passkey)
    })

    test("fills missing assertion indices from clientDataJSON", async () => {
        const clientDataJSON =
            '{"type":"webauthn.get","challenge":"abc","origin":"https://example.com"}'
        const source = toWebAuthnSignSource({
            publicKey: `0x${"11".repeat(64)}`,
            sign: async () =>
                ({
                    signature: `0x${"22".repeat(64)}`,
                    webauthn: { authenticatorData: "0x", clientDataJSON }
                }) as never
        })
        const { webauthn } = await source.sign({ hash: `0x${"33".repeat(32)}` })
        expect(webauthn.challengeIndex).toBe(23)
        expect(webauthn.typeIndex).toBe(1)
    })

    test("honours an authenticator override on both actor and signer", () => {
        const authenticator = "0x6666666666666666666666666666666666666666"
        const actor = webAuthnKeyToEip8130Actor({ webAuthnKey, authenticator })
        expect(actor.authenticator).toBe(authenticator)
        expect(actor.signer.authenticator).toBe(authenticator)
    })
})
