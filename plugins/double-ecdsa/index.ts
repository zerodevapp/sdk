import type { KernelValidator } from "@zerodev/sdk/types"
import {
    type Bytes4,
    enableDoubleEcdsaValidator
} from "./enableDoubleECDSAValidator.js"
import { signerToDoubleEcdsaValidator } from "./toDoubleECDSAValidatorPlugin.js"

export {
    enableDoubleEcdsaValidator,
    type Bytes4,
    signerToDoubleEcdsaValidator,
    type KernelValidator
}

export const DOUBLE_ECDSA_VALIDATOR_ADDRESS =
    "0x9ff6978a3E570E3055E272E63Af242BA74e21D68"
