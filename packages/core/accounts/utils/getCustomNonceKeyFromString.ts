import { getEntryPointVersion } from "permissionless"
import type { EntryPoint } from "permissionless/types"
import { keccak256, toHex } from "viem"

const hashAndTruncate = (input: string, byteSize: number): bigint => {
    const hash = keccak256(toHex(input))
    const truncatedHash = hash.substring(2, byteSize * 2 + 2) // 2 hex characters per byte
    return BigInt(`0x${truncatedHash}`)
}

export const getCustomNonceKeyFromString = (
    input: string,
    entryPoint: EntryPoint
) => {
    const entryPointVersion = getEntryPointVersion(entryPoint)

    if (entryPointVersion === "v0.6") {
        return hashAndTruncate(input, 24) // 24 bytes for v0.6
    }
    return hashAndTruncate(input, 2) // 2 bytes for v0.7
}
