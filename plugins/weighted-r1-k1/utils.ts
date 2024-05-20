import { type Hex, encodeAbiParameters } from "viem"

export const encodeSignatures = (signatures: Hex[]) => {
    return encodeAbiParameters(
        [{ name: "signatures", type: "bytes[]" }],
        [signatures]
    )
}
