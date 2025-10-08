import type { KernelValidator } from "@zerodev/sdk/types"
import {
    type ApprovePluginParameters,
    approvePlugin
} from "./actions/approvePlugin.js"
import {
    type ApproveUserOperationParameters,
    approveUserOperation
} from "./actions/approveUserOperation.js"
import {
    type SendUserOperationWithSignaturesParameters,
    sendUserOperationWithSignatures
} from "./actions/sendUserOperationWithSignatures.js"
import {
    type WeightedKernelAccountClientActions,
    weightedKernelAccountClientActions
} from "./clients/decorators/weightedKernelAccountClient.js"
import {
    type WeightedKernelAccountClient,
    createWeightedKernelAccountClient
} from "./clients/weightedKernelAccountClient.js"
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
    WeightedValidatorContractVersion,
    createWeightedValidator,
    getValidatorAddress
} from "./toWeightedValidatorPlugin.js"

export {
    createWeightedValidator,
    type WeightedValidatorConfig,
    type WeightedSigner,
    getValidatorAddress,
    type KernelValidator,
    toECDSASigner,
    type ECDSASignerParams,
    type WebAuthnModularSignerParams,
    toWebAuthnSigner,
    type ApprovePluginParameters,
    approvePlugin,
    type ApproveUserOperationParameters,
    approveUserOperation,
    type SendUserOperationWithSignaturesParameters,
    sendUserOperationWithSignatures,
    type WeightedKernelAccountClient,
    createWeightedKernelAccountClient,
    type WeightedKernelAccountClientActions,
    weightedKernelAccountClientActions,
    WeightedValidatorContractVersion
}
export * from "./constants.js"
export * from "./utils.js"
