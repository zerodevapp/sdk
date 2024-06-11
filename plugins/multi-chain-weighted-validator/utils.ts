import { type Hex, decodeAbiParameters, encodeAbiParameters } from "viem"

export const encodeSignatures = (merkleData: Hex, signatures: Hex[]) => {
    return encodeAbiParameters(
        [
            { name: "merkleData", type: "bytes" },
            { name: "signatures", type: "bytes[]" }
        ],
        [merkleData, signatures]
    )
}

export const decodeSignatures = (
    signaturesData: Hex
): { merkleData: Hex; signatures: Hex[] } => {
    const [merkleData, signatures] = decodeAbiParameters(
        [
            { name: "merkleData", type: "bytes" },
            { name: "signatures", type: "bytes[]" }
        ],
        signaturesData
    )
    return {
        merkleData,
        signatures: [...signatures]
    }
}
