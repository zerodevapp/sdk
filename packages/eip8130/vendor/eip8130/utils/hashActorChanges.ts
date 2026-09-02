// Vendored from wevm/viem#5004 (src/eip8130/utils/hashActorChanges.ts) at 7992598. Drop once viem ships `viem/eip8130`.
// viem-internal `*ErrorType` aliases removed; imports point at public viem entrypoints.
import {
    type Address,
    type Hex,
    concatHex,
    encodeAbiParameters,
    keccak256,
    stringToHex
} from "viem"
import type { AaChange } from "../types/transaction.js"
import { encodeChangePayload } from "./actorChangeData.js"
/** `keccak256("AccountChange(uint8 changeType,bytes payload)")` */
export const accountChangeTypehash = keccak256(
    stringToHex("AccountChange(uint8 changeType,bytes payload)")
)

/**
 * `keccak256("SignedAccountChanges(address account,uint256 chainId,uint64 sequence,AccountChange[] changes)AccountChange(uint8 changeType,bytes payload)")`
 */
export const signedAccountChangesTypehash = keccak256(
    stringToHex(
        "SignedAccountChanges(address account,uint256 chainId,uint64 sequence,AccountChange[] changes)AccountChange(uint8 changeType,bytes payload)"
    )
)

export type HashAccountChangesParameters = {
    /** The account whose configuration is changing. */
    account: Address
    /**
     * The replay chain id bound into the digest: `block.chainid` for the `'local'`
     * channel, `0` for `'multichain'`.
     */
    chainId: number | bigint
    /** The channel sequence word (`uint64`). */
    sequence: number | bigint
    /** The ordered ops in the batch. */
    changes: readonly AaChange[]
}

/**
 * Computes the EIP-8130 `SignedAccountChanges` batch signature digest
 * (`Keystore._changesDigest`):
 *
 * ```
 * changeHashes = [keccak256(abi.encode(ACCOUNT_CHANGE_TYPEHASH, changeType, keccak256(payload)))]
 * changesHash  = keccak256(abi.encodePacked(changeHashes))
 * digest       = keccak256(abi.encode(SIGNED_ACCOUNT_CHANGES_TYPEHASH, account, chainId, sequence, changesHash))
 * ```
 *
 * The resulting digest is signed (in `authenticator || data` form) to produce
 * the config entry's `signature`.
 */
export function hashAccountChanges(
    parameters: HashAccountChangesParameters
): Hex {
    const { account, chainId, sequence, changes } = parameters

    const changeHashes = changes.map((change) =>
        keccak256(
            encodeAbiParameters(
                [{ type: "bytes32" }, { type: "uint8" }, { type: "bytes32" }],
                [
                    accountChangeTypehash,
                    change.changeType,
                    keccak256(encodeChangePayload(change))
                ]
            )
        )
    )
    const changesHash = keccak256(concatHex(changeHashes))

    return keccak256(
        encodeAbiParameters(
            [
                { type: "bytes32" },
                { type: "address" },
                { type: "uint256" },
                { type: "uint64" },
                { type: "bytes32" }
            ],
            [
                signedAccountChangesTypehash,
                account,
                BigInt(chainId),
                BigInt(sequence),
                changesHash
            ]
        )
    )
}
