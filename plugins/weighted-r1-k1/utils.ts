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
