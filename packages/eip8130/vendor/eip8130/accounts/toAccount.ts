// Vendored from wevm/viem#5004 (src/eip8130/accounts/toAccount.ts) at 7992598. Drop once viem ships `viem/eip8130`.
// Trimmed to the address-only shape: Kernel accounts already exist (or are deployed through the Kernel factory),
// so the CREATE2 `userSalt + code + initialActors` shape, `newSmartAccount`, `toEoaAccount` and `toDelegateSigner` are omitted.
import { type Address, BaseError, type Hex } from "viem"
import {
    canonicalAuthenticators,
    ecrecoverAuthenticator
} from "../constants.js"
import { key } from "../keys.js"
import type {
    AaAccountChangeConfig,
    AaAccountChangeCreate,
    AaAccountChangeDelegation,
    AaActor,
    AaChange,
    AaChangeChannel,
    TransactionSerializable8130,
    TransactionSerialized8130
} from "../types/transaction.js"
import { signAccountChanges } from "../utils/signActorChanges.js"
import { type Signer, signTransaction } from "../utils/signTransaction.js"

export type ToAccountParameters = {
    /** Signer that produces `sender_auth` / `auth` blobs for this account. */
    signer: Signer
    /**
     * Authenticator address for the signer's auth blobs. Defaults to the
     * native `ECRECOVER_AUTHENTICATOR` (secp256k1). Set to the P-256 /
     * WebAuthn / delegate authenticator address for non-K1 signers.
     */
    authenticator?: Address | undefined
    /**
     * Scope bitmask of the **signing actor** on this account. Prefer omitting
     * this once the actor is on-chain: `prepareTransactionRequest` reads
     * `getActorConfig` and derives nonce mode from chain truth. When set on an
     * already-bound actor it must match the on-chain value.
     */
    scope?: number | undefined
    /**
     * 32-byte actor id of the signing actor. Defaults to `key.k1(signer.address)`
     * when the authenticator is the native ecrecover / K1 authenticator. Required
     * for P-256 / passkey / delegate signers so prepare can read on-chain scope.
     */
    actorId?: Hex | undefined
    /** The known account address. */
    address: Address
}

export type ToAccountReturnType = {
    readonly address: Address
    readonly signer: Signer
    readonly initialActors: readonly AaActor[]
    /** Scope of the signing actor, when known off-chain. */
    readonly scope?: number | undefined
    /** Actor id used for on-chain scope lookup / auth. */
    readonly actorId?: Hex | undefined
    /** viem account kind (`'local'`). */
    readonly type: "local"
    /** viem account source marker. */
    readonly source: "eip8130"
    /** SEC1 hex public key of a K1 signer, or `'0x'` for non-K1 signers. */
    readonly publicKey: Hex
    /** Not supported for EIP-8130 accounts. */
    signMessage(): never
    /** Not supported for EIP-8130 accounts. */
    signTypedData(): never
    /** Not available for address-only accounts; always throws. */
    create(): AaAccountChangeCreate
    /** Signs a `SignedAccountChanges` batch into a `config` entry. */
    change(
        changes: readonly AaChange[],
        options?: {
            channel?: AaChangeChannel
            chainId?: number
            sequence?: bigint
        }
    ): Promise<AaAccountChangeConfig>
    /** Builds an EIP-7702 `delegation` account-change entry. */
    delegate(target: Address): AaAccountChangeDelegation
    /** Signs an `AA_TX_TYPE` transaction as this account (configured-actor path). */
    signTransaction(
        transaction: TransactionSerializable8130,
        options?: {
            payer?: { account: Signer; address?: Address } | undefined
        }
    ): Promise<TransactionSerialized8130>
}

/**
 * Creates a local EIP-8130 account helper for the **configured-actor** signing
 * path (authenticator-prefixed `senderAuth`) bound to a known address.
 */
export function toAccount(
    parameters: ToAccountParameters
): ToAccountReturnType {
    const {
        signer,
        authenticator = ecrecoverAuthenticator,
        scope,
        address
    } = parameters

    // K1 / ecrecover signers: actorId is a pure function of the signer address.
    // Non-K1 authenticators must pass `actorId` explicitly for on-chain scope reads.
    const isK1Authenticator =
        authenticator === ecrecoverAuthenticator ||
        authenticator === canonicalAuthenticators.k1
    const actorId =
        parameters.actorId ??
        (isK1Authenticator ? key.k1(signer.address).actorId : undefined)

    const signerPublicKey = (signer as { publicKey?: unknown }).publicKey
    const publicKey: Hex =
        typeof signerPublicKey === "string" ? (signerPublicKey as Hex) : "0x"

    return {
        address,
        signer,
        initialActors: [],
        scope,
        actorId,
        type: "local",
        source: "eip8130",
        publicKey,
        signMessage(): never {
            throw new BaseError(
                "`signMessage` is not supported for EIP-8130 accounts."
            )
        },
        signTypedData(): never {
            throw new BaseError(
                "`signTypedData` is not supported for EIP-8130 accounts."
            )
        },
        create() {
            throw new BaseError(
                "`create()` is not available for address-only accounts. " +
                    "Include `account.delegate(impl)` in `accountChanges` instead."
            )
        },
        async change(changes, options = {}) {
            return signAccountChanges({
                signer,
                account: address,
                channel: options.channel ?? "local",
                chainId: options.chainId ?? 0,
                sequence: options.sequence ?? 0n,
                changes,
                authenticator
            })
        },
        delegate(target) {
            return { type: "delegation", target }
        },
        async signTransaction(transaction, options = {}) {
            if (!signer.sign)
                throw new BaseError("`signer` does not support raw signing.")
            return signTransaction({
                transaction: {
                    ...transaction,
                    from: transaction.from ?? address
                },
                account: signer,
                authenticator,
                payer: options.payer
            })
        }
    }
}
