import { p256 } from "@noble/curves/p256"
import {
    type Hex,
    bytesToBigInt,
    concatHex,
    hexToBytes,
    pad,
    toHex
} from "viem"
import type { WebAuthnKey } from "./toWebAuthnSigner.js"

const RIP7212_SUPPORTED_NETWORKS = [80001]

export const uint8ArrayToHexString = (array: Uint8Array): `0x${string}` => {
    return `0x${Array.from(array, (byte) =>
        byte.toString(16).padStart(2, "0")
    ).join("")}` as `0x${string}`
}

export const b64ToBytes = (base64: string): Uint8Array => {
    const paddedBase64 = base64
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    const binString = atob(paddedBase64)
    return Uint8Array.from(binString, (m) => m.codePointAt(0) ?? 0)
}

export const findQuoteIndices = (
    input: string
): { beforeType: bigint; beforeChallenge: bigint } => {
    const beforeTypeIndex = BigInt(input.lastIndexOf('"type":"webauthn.get"'))
    const beforeChallengeIndex = BigInt(input.indexOf('"challenge'))
    return {
        beforeType: beforeTypeIndex,
        beforeChallenge: beforeChallengeIndex
    }
}

// Parse DER-encoded P256-SHA256 signature to contract-friendly signature
// and normalize it so the signature is not malleable.
export function parseAndNormalizeSig(derSig: Hex): { r: bigint; s: bigint } {
    const parsedSignature = p256.Signature.fromDER(derSig.slice(2))
    const bSig = hexToBytes(`0x${parsedSignature.toCompactHex()}`)
    // assert(bSig.length === 64, "signature is not 64 bytes");
    const bR = bSig.slice(0, 32)
    const bS = bSig.slice(32)

    // Avoid malleability. Ensure low S (<= N/2 where N is the curve order)
    const r = bytesToBigInt(bR)
    let s = bytesToBigInt(bS)
    const n = BigInt(
        "0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551"
    )
    if (s > n / 2n) {
        s = n - s
    }
    return { r, s }
}

export const isRIP7212SupportedNetwork = (chainId: number): boolean =>
    RIP7212_SUPPORTED_NETWORKS.includes(chainId)

export const encodeWebAuthnPubKey = (pubKey: WebAuthnKey) => {
    return concatHex([
        toHex(pubKey.pubX, { size: 32 }),
        toHex(pubKey.pubY, { size: 32 }),
        pad(pubKey.authenticatorIdHash, { size: 32 })
    ])
}
