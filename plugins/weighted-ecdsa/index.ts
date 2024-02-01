import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createWeightedECDSAValidator,
    getUpdateConfigCall
} from "./toWeightedECDSAValidatorPlugin.js"

export {
    createWeightedECDSAValidator,
    getUpdateConfigCall,
    type KernelValidator
}

/// @dev note that only deployed on polygon-mumbai now
export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS =
    "0x95F9a0FCBB300717Cef393e1Ae80b84D448D34Da"
