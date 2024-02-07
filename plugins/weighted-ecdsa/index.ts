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
    "0xaFA369cA3432e62ACe6bd77B2886F2D588c68dA8"
