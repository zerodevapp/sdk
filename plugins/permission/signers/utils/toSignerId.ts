import { type Hex, concat, encodeAbiParameters } from "viem"
import type { ModularSigner } from "../../types.js"

export const toSignerId = (signer: ModularSigner): Hex => {
    return encodeAbiParameters(
        [{ name: "signerData", type: "bytes" }],
        [concat([signer.signerContractAddress, signer.getSignerData()])]
    )
}
