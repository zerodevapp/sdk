import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createWeightedECDSAValidator,
    updateConfig
} from "./toWeigthedECDSAValidatorPlugin.js"

export { createWeightedECDSAValidator, updateConfig, type KernelValidator }

export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS =
    "0xa7e3Bc66086Ae51b20e59b6C84666635A0d0A16C"
