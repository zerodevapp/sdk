import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createWeightedECDSAValidator,
    getCurrentSigners,
    getUpdateConfigCall
} from "./toWeightedECDSAValidatorPlugin.js"

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
    "0x87B1dBe3CDc829f8ac2c07Ac5dEe78e69bFb6216"
