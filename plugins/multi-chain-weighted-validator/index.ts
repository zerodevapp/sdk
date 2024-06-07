import type { KernelValidator } from "@zerodev/sdk/types"
import {
    type ApproveUserOperationParameters,
    type ApproveUserOperationReturnType,
    approveUserOperation
} from "./actions/approveUserOperation.js"
import {
    type SendUserOperationWithApprovalsParameters,
    sendUserOperationWithApprovals
} from "./actions/sendUserOperationWithApprovals.js"
import {
    type MultiChainWeightedKernelAccountClientActions,
    multiChainWeightedKernelAccountClientActions
} from "./clients/decorators/multiChainWeightedKernelAccountClient.js"
import {
    type MultiChainWeightedKernelAccountClient,
    createMultiChainWeightedKernelAccountClient
} from "./clients/multiChainWeightedKernelAccountClient.js"
import {
    type ECDSASignerParams,
    toECDSASigner
} from "./signers/toECDSASigner.js"
import { WebAuthnMode, toWebAuthnPubKey } from "./signers/toWebAuthnPubKey.js"
import {
    type WebAuthnKey,
    type WebAuthnModularSignerParams,
    toWebAuthnSigner
} from "./signers/toWebAuthnSigner.js"
import {
    type WeightedSigner,
    type WeightedValidatorConfig,
    createMultiChainWeightedValidator,
    getValidatorAddress
} from "./toMultiChainWeightedValidatorPlugin.js"

export {
    createMultiChainWeightedValidator,
    type WeightedValidatorConfig,
    type WeightedSigner,
    getValidatorAddress,
    type KernelValidator,
    toECDSASigner,
    type ECDSASignerParams,
    toWebAuthnPubKey,
    type WebAuthnKey,
    WebAuthnMode,
    type WebAuthnModularSignerParams,
    toWebAuthnSigner,
    type ApproveUserOperationParameters,
    type ApproveUserOperationReturnType,
    approveUserOperation,
    type SendUserOperationWithApprovalsParameters,
    sendUserOperationWithApprovals,
    type MultiChainWeightedKernelAccountClient,
    createMultiChainWeightedKernelAccountClient,
    type MultiChainWeightedKernelAccountClientActions,
    multiChainWeightedKernelAccountClientActions
}
export * from "./constants.js"
export * from "./utils.js"
