// Vendored from wevm/viem#5004 (src/eip8130/utils/actorId.ts) at 7992598. Drop once viem ships `viem/eip8130`.
// viem-internal `*ErrorType` aliases removed; imports point at public viem entrypoints.
import {
    type Address,
    BaseError,
    type Hex,
    concatHex,
    keccak256,
    pad,
    size
} from "viem"

/**
 * Derives the `actorId` for an address-based actor:
 * `bytes32(uint256(uint160(address)))`.
 *
 * Used for the implicit EOA actor, `k1` (`ECRECOVER_AUTHENTICATOR`), and
 * `delegate` actors. The 20-byte address is right-aligned into the low-order
 * bytes and the high 12 bytes are zero (matches `Keystore.ActorId.fromAddress`
 * and enables the standard `address(uint160(uint256(id)))` round-trip).
 */
export function actorIdFromAddress(address: Address): Hex {
    return pad(address, { dir: "left", size: 32 })
}

/**
 * Derives the `actorId` for a public-key actor (`p256`, `passkey`):
 * `keccak256(abi.encodePacked(x, y))`.
 *
 * Accepts the affine coordinates as 32-byte hex values, or a single 64-byte
 * concatenated `x || y` public key.
 */
export function actorIdFromPublicKey(publicKey: { x: Hex; y: Hex } | Hex): Hex {
    if (typeof publicKey === "string") {
        if (size(publicKey) !== 64)
            throw new BaseError(
                `Public key must be 64 bytes (x || y); got ${size(publicKey)} bytes.`
            )
        return keccak256(publicKey)
    }
    const { x, y } = publicKey
    if (size(x) !== 32 || size(y) !== 32)
        throw new BaseError(
            "Public key coordinates `x` and `y` must be 32 bytes."
        )
    return keccak256(concatHex([x, y]))
}
