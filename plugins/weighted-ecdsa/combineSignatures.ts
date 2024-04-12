import type { Address, Hex } from "viem"

export type SignerSignature = {
    signerAddress: Address
    signature: Hex
}

export function combineSignatures(signerSignatures: SignerSignature[]): Hex {
    // sort the signatures by signer address in descending order
    signerSignatures.sort((a, b) =>
        a.signerAddress.toLowerCase() < b.signerAddress.toLowerCase() ? 1 : -1
    )
    // combine the signatures
    const combinedSignature = signerSignatures
        .map((signature) => signature.signature.slice(2)) // Remove '0x' prefix
        .join("")
    return `0x${combinedSignature}`
}
