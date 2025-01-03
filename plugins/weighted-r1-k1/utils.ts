import { type Hex, decodeAbiParameters, encodeAbiParameters } from "viem"

export const encodeSignatures = (signatures: Hex[]) => {
    return encodeAbiParameters(
        [{ name: "signatures", type: "bytes[]" }],
        [signatures]
    )
}

export const decodeSignatures = (signaturesData: Hex): Hex[] => {
    const [signatures] = decodeAbiParameters(
        [{ name: "signatures", type: "bytes[]" }],
        signaturesData
    )
    return [...signatures]
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
