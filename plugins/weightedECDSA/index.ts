import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createWeightedECDSAValidator,
    updateConfig
} from "./toWeightedECDSAValidatorPlugin.js"

export { createWeightedECDSAValidator, updateConfig, type KernelValidator }

export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS =
    "0x5D688bE9c6c577d35C1e8f819CE17A8bA8df756C"
