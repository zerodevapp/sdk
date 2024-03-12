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
    "0xf230ac0AD98F81cd9806b5A6B16f8Fb92Fb6Fc48"
