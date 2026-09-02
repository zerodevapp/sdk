import type { LocalAccount } from "viem"
import type { KernelEip8130Actor } from "../types.js"
import { key } from "../vendor/eip8130/index.js"

/**
 * secp256k1 actor for an EOA signer (native ECRECOVER authenticator), e.g. the
 * owner behind an ECDSA validator. The signer must raw-sign hashes (`sign`),
 * as `privateKeyToAccount` does; wallet-client signers cannot (personal_sign
 * only) and are rejected up front rather than failing at send time.
 */
export function signerToEip8130Actor(
    signer: Pick<LocalAccount, "address" | "sign">
): KernelEip8130Actor {
    if (typeof signer.sign !== "function") {
        throw new Error(
            "EIP-8130 actor signer must support raw hash signing (`sign`)"
        )
    }
    return { ...key.k1(signer.address), signer }
}
