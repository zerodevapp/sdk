import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createWeightedECDSAValidator,
    getCurrentSigners,
    getUpdateConfigCall
} from "./toWeightedECDSAValidatorPlugin.js"

export { signWithSingleSigner } from "./signWithSingleSigner.js"
export { combineSignatures, type SignerSignature } from "./combineSignatures.js"

export {
    createWeightedECDSAValidator,
    getUpdateConfigCall,
    getCurrentSigners,
    type KernelValidator
}

/// @dev note that only deployed on polygon-mumbai now
export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS_V06 =
    "0x8012D9ee59176Cb01a4aa80fCFE6f5E8bA58d4fb"

export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS_V07 =
    "0x750Fe8F6FE28b9F2Bd89B4B195c4a9f5D9F5fAa1"
