import type { Hex } from "viem"
import { decodeAbiParameters } from "viem/utils"

export function decodeSignature(signature: Hex) {
    const [_, passkeySig] = decodeAbiParameters(
        [
            {
                name: "merkleData",
                type: "bytes"
            },
            {
                name: "signature",
                type: "bytes"
            }
        ],
        signature
    )
    return passkeySig
}
