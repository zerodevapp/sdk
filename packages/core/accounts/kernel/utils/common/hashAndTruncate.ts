import { keccak256, toHex } from "viem"

export const hashAndTruncate = (input: string, byteSize: number): bigint => {
    const hash = keccak256(toHex(input))
    const truncatedHash = hash.substring(2, byteSize * 2 + 2) // 2 hex characters per byte
    return BigInt(`0x${truncatedHash}`)
}
