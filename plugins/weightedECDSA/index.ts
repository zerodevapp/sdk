import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createWeightedECDSAValidator,
    updateConfig
} from "./toWeightedECDSAValidatorPlugin.js"

export { createWeightedECDSAValidator, updateConfig, type KernelValidator }

export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS =
    "0x4aF8d54FA0D551224a93168160992Fc2427f2BF0"
