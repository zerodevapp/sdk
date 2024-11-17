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

// Sort addresses in descending order
export const sortByPublicKey = (
    a: { publicKey: Hex } | { getPublicKey: () => Hex },
    b: { publicKey: Hex } | { getPublicKey: () => Hex }
) => {
    if ("publicKey" in a && "publicKey" in b)
        return a.publicKey.toLowerCase() < b.publicKey.toLowerCase() ? 1 : -1
    else if ("getPublicKey" in a && "getPublicKey" in b)
        return a.getPublicKey().toLowerCase() < b.getPublicKey().toLowerCase()
            ? 1
            : -1
    else return 0
}
