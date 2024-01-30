import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createWeightedECDSAValidator,
    updateConfig
} from "./toWeightedECDSAValidatorPlugin.js"

export { createWeightedECDSAValidator, updateConfig, type KernelValidator }

/// @dev note that only deployed on polygon-mumbai now
export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS =
    "0x30e5da962BB73ee52e105275C3a10D3F3DdFea0c"
