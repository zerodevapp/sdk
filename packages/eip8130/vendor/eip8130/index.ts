// Vendored subset of `viem/eip8130` (wevm/viem#5004 at 7992598). Drop once viem ships it.
export { erc4337AccountAbi, keystoreAbi } from "./abis.js"
export {
    toAccount,
    type ToAccountParameters,
    type ToAccountReturnType
} from "./accounts/toAccount.js"
export {
    estimateGas,
    type EstimateGasParameters,
    type EstimateGasReturnType
} from "./actions/estimateGas.js"
export {
    getActorConfig,
    type GetActorConfigParameters,
    type GetActorConfigReturnType
} from "./actions/getActorConfig.js"
export {
    getConfigSequence,
    type GetConfigSequenceParameters,
    type GetConfigSequenceReturnType
} from "./actions/getConfigSequence.js"
export { getTransaction, type Transaction } from "./actions/getTransaction.js"
export { getTransactionCount } from "./actions/getTransactionCount.js"
export {
    allPhasesSucceeded,
    getTransactionReceipt,
    type GetTransactionReceiptReturnType,
    parseReceiptFields,
    type ReceiptFields
} from "./actions/getTransactionReceipt.js"
export { isActor } from "./actions/isActor.js"
export {
    prepareTransactionRequest,
    type PrepareTransactionRequestParameters,
    sendTransaction,
    type SendTransactionParameters,
    type SendTransactionReturnType
} from "./actions/sendTransaction.js"
export {
    waitForTransactionReceipt,
    type WaitForTransactionReceiptParameters,
    type WaitForTransactionReceiptReturnType
} from "./actions/waitForTransactionReceipt.js"
export {
    actorScope,
    canonicalAuthenticators,
    ecrecoverAuthenticator,
    keystoreAddress,
    nonceKeyMax,
    scopeUnrestricted
} from "./constants.js"
export {
    ActorNotBoundError,
    NonceScopeError,
    ScopeMismatchError,
    TransactionExpiredError
} from "./errors.js"
export {
    authorizeActor,
    isNoncelessOnly,
    key,
    revokeActor,
    toScope
} from "./keys.js"
export type {
    AaAccountChange,
    AaActor,
    AaCall,
    AaCalls,
    AaChange,
    TransactionSerializable8130,
    TransactionSerialized8130
} from "./types/transaction.js"
export { actorIdFromAddress, actorIdFromPublicKey } from "./utils/actorId.js"
export {
    defaultEncodeExecute,
    type EncodeExecute,
    type EncodeExecuteParameters,
    encodeWalletCalls
} from "./utils/encodeWalletCalls.js"
export { parseTransaction } from "./utils/parseTransaction.js"
export { serializeTransaction } from "./utils/serializeTransaction.js"
export { signAccountChanges } from "./utils/signActorChanges.js"
export {
    toWebAuthnSigner,
    type ToWebAuthnSignerParameters,
    type WebAuthnSignSource
} from "./utils/signers.js"
export { type Signer, signTransaction } from "./utils/signTransaction.js"
