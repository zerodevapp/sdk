import { p256 } from "@noble/curves/p256"
import type {
    AuthenticationResponseJSON,
    RegistrationResponseJSON
} from "@simplewebauthn/types"
import type { WebAuthnKey } from "@zerodev/webauthn-key"
import { BitString, fromBER } from "asn1js"
import { type Hex, bytesToBigInt, hexToBytes, keccak256 } from "viem"

declare module "asn1js" {
    interface ValueBlock {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        value: Array<any>
        valueHex?: ArrayBuffer
    }
}

const RIP7212_SUPPORTED_NETWORKS = [80001, 137]

export const isRIP7212SupportedNetwork = (chainId: number): boolean =>
    RIP7212_SUPPORTED_NETWORKS.includes(chainId)

export const uint8ArrayToHexString = (array: Uint8Array): `0x${string}` => {
    return `0x${Array.from(array, (byte) =>
        byte.toString(16).padStart(2, "0")
    ).join("")}` as `0x${string}`
}

export const hexStringToUint8Array = (hexString: string): Uint8Array => {
    const formattedHexString = hexString.startsWith("0x")
        ? hexString.slice(2)
        : hexString
    const byteArray = new Uint8Array(formattedHexString.length / 2)
    for (let i = 0; i < formattedHexString.length; i += 2) {
        byteArray[i / 2] = Number.parseInt(
            formattedHexString.substring(i, i + 2),
            16
        )
    }
    return byteArray
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

type PasskeyValidatorSerializedData = {
    entryPoint: { address: Hex; version: string }
    validatorAddress: Hex
    pubKeyX: bigint
    pubKeyY: bigint
    authenticatorId: string
    authenticatorIdHash: Hex
}

export const serializePasskeyValidatorData = (
    params: PasskeyValidatorSerializedData
) => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const replacer = (_: string, value: any) => {
        if (typeof value === "bigint") {
            return value.toString()
        }
        return value
    }

    const jsonString = JSON.stringify(params, replacer)
    const uint8Array = new TextEncoder().encode(jsonString)
    const base64String = bytesToBase64(uint8Array)
    return base64String
}

export const deserializePasskeyValidatorData = (params: string) => {
    const uint8Array = base64ToBytes(params)
    const jsonString = new TextDecoder().decode(uint8Array)
    const parsed = JSON.parse(jsonString) as PasskeyValidatorSerializedData
    return parsed
}

function base64ToBytes(base64: string) {
    const binString = atob(base64)
    return Uint8Array.from(binString, (m) => m.codePointAt(0) as number)
}

function bytesToBase64(bytes: Uint8Array) {
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("")
    return btoa(binString)
}

/**
 * Convenience function for creating a base64 encoded string from an ArrayBuffer instance
 * Copied from @hexagon/base64 package (base64.fromArrayBuffer)
 * @public
 *
 * @param {Uint8Array} uint8Arr - Uint8Array to be encoded
 * @param {boolean} [urlMode] - If set to true, URL mode string will be returned
 * @returns {string} - Base64 representation of data
 */
export const base64FromUint8Array = (
    uint8Arr: Uint8Array,
    urlMode: boolean
): string => {
    const // Regular base64 characters
        chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    const // Base64url characters
        charsUrl =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

    let result = ""

    const len = uint8Arr.length
    const target = urlMode ? charsUrl : chars

    for (let i = 0; i < len; i += 3) {
        result += target[uint8Arr[i] >> 2]
        result += target[((uint8Arr[i] & 3) << 4) | (uint8Arr[i + 1] >> 4)]
        result += target[((uint8Arr[i + 1] & 15) << 2) | (uint8Arr[i + 2] >> 6)]
        result += target[uint8Arr[i + 2] & 63]
    }

    const remainder = len % 3
    if (remainder === 2) {
        result = result.substring(0, result.length - 1) + (urlMode ? "" : "=")
    } else if (remainder === 1) {
        result = result.substring(0, result.length - 2) + (urlMode ? "" : "==")
    }

    return result
}

/**
 * Parses a base64-encoded SPKI for P-256 ECDSA public key.
 * Extracts the uncompressed point (0x04 + 32-byte X + 32-byte Y) from the BIT STRING.
 * Then slices out (x, y) in hex.
 */
export function parseP256SpkiBase64(pubKeyB64: string) {
    // 1. Decode base64 -> Uint8Array
    const raw = Buffer.from(pubKeyB64, "base64")
    // Convert that into an ArrayBuffer needed by asn1js
    const rawArrayBuf = raw.buffer.slice(
        raw.byteOffset,
        raw.byteOffset + raw.byteLength
    )

    // 2. Parse the ASN.1
    // @ts-ignore - fromBER accepts array buffers in practice
    const asn1 = fromBER(rawArrayBuf)
    if (asn1.offset === -1) {
        throw new Error("Failed to parse ASN.1 structure (offset = -1).")
    }

    // Typically SubjectPublicKeyInfo = SEQUENCE(2) => [0] AlgorithmIdentifier, [1] subjectPublicKey (BIT STRING)
    const spkiSequence = asn1.result
    // @ts-ignore - value is definitely an array in practice
    if (!spkiSequence.valueBlock || spkiSequence.valueBlock.value.length < 2) {
        throw new Error("Not a valid SubjectPublicKeyInfo sequence.")
    }

    // The second element should be a BIT STRING representing the public key
    // @ts-ignore - value is definitely an array in practice
    const subjectPublicKeyInfo = spkiSequence.valueBlock.value[1]
    if (!(subjectPublicKeyInfo instanceof BitString)) {
        throw new Error(
            "SPKI does not contain a BitString in the second element."
        )
    }

    // 3. The actual uncompressed key bytes are in subjectPublicKeyInfo.valueBlock.valueHex
    // This is an ArrayBuffer. Convert to Uint8Array for easy slicing.
    const pkBitString = new Uint8Array(subjectPublicKeyInfo.valueBlock.valueHex)

    /**
     * Some notes:
     * - Usually for an uncompressed ECDSA key on P-256, pkBitString starts with 0x04,
     *   followed by 32 bytes X, 32 bytes Y.
     * - asn1js automatically handles the "unused bits" in the BIT STRING, so we
     *   typically don't need to skip a byte with "unused bits" manually.
     */

    // If uncompressed, we expect exactly 65 bytes: 0x04 + 32 + 32
    if (pkBitString.length < 65) {
        throw new Error(
            `Public key bit string is too short. Length = ${pkBitString.length}`
        )
    }
    if (pkBitString[0] !== 0x04) {
        throw new Error(
            "Expected uncompressed format (0x04) at start of public key data."
        )
    }

    // 4. Extract X/Y
    const xBytes = pkBitString.slice(1, 33)
    const yBytes = pkBitString.slice(33, 65)

    const xHex = Buffer.from(xBytes).toString("hex")
    const yHex = Buffer.from(yBytes).toString("hex")

    return { xHex, yHex }
}

export const parsePasskeyCred = (
    cred: RegistrationResponseJSON,
    rpID: string
): WebAuthnKey => {
    const authenticatorId = cred.id
    const authenticatorIdHash = keccak256(
        uint8ArrayToHexString(b64ToBytes(authenticatorId))
    )
    const pubKey = cred.response.publicKey

    if (!pubKey) {
        throw new Error("No public key found in response")
    }

    const { xHex, yHex } = parseP256SpkiBase64(pubKey)

    return {
        pubX: BigInt(`0x${xHex}`),
        pubY: BigInt(`0x${yHex}`),
        authenticatorId,
        authenticatorIdHash,
        rpID
    }
}

export const parseLoginCred = (
    cred: AuthenticationResponseJSON,
    xHex: string,
    yHex: string,
    rpID: string
): WebAuthnKey => {
    const authenticatorId = cred.id
    const authenticatorIdHash = keccak256(
        uint8ArrayToHexString(b64ToBytes(authenticatorId))
    )

    return {
        pubX: BigInt(`0x${xHex}`),
        pubY: BigInt(`0x${yHex}`),
        authenticatorId,
        authenticatorIdHash,
        rpID
    }
}
