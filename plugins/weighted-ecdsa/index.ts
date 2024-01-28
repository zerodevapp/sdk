import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createWeightedECDSAValidator,
    updateConfig
} from "./toWeightedECDSAValidatorPlugin.js"

export { createWeightedECDSAValidator, updateConfig, type KernelValidator }

export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS =
    "0x5527b0d72D2e814F3B4aEda691a25b11d417bAaf"
