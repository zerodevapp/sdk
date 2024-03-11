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
    "0x01D30994b3682dF8124e067a92a0B7E8B14E9BBf"
