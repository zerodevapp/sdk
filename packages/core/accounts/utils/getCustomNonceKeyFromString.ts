import { keccak256, toHex } from "viem"
import type { EntryPointVersion } from "viem/account-abstraction"

const hashAndTruncate = (input: string, byteSize: number): bigint => {
    const hash = keccak256(toHex(input))
    const truncatedHash = hash.substring(2, byteSize * 2 + 2) // 2 hex characters per byte
    return BigInt(`0x${truncatedHash}`)
}

export const getCustomNonceKeyFromString = (
    input: string,
    entryPointVersion: EntryPointVersion
) => {
    if (entryPointVersion === "0.6") {
        return hashAndTruncate(input, 24) // 24 bytes for v0.6
    }
    return hashAndTruncate(input, 2) // 2 bytes for v0.7
}
