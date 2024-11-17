import type { KernelValidator } from "@zerodev/sdk/types"
import {
    type WebAuthnKey,
    WebAuthnMode,
    toWebAuthnKey
} from "@zerodev/webauthn-key"
import {
    type ApproveUserOperationParameters,
    type ApproveUserOperationReturnType,
    approveUserOperation
} from "./actions/approveUserOperation.js"
import { getCurrentSigners } from "./actions/getCurrentSigners.js"
import {
    type SendUserOperationWithApprovalsParameters,
    sendUserOperationWithApprovals
} from "./actions/sendUserOperationWithApprovals.js"
import {
    type UpdateSignersDataParameters,
    updateSignersData
} from "./actions/updateSignersData.js"
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
import {
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
    toWebAuthnKey,
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
    multiChainWeightedKernelAccountClientActions,
    type UpdateSignersDataParameters,
    getCurrentSigners,
    updateSignersData
}
export * from "./constants.js"
export * from "./utils.js"
