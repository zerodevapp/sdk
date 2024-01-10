import type { KernelPlugin } from "@kerneljs/core/types"
import { signerToEcdsaValidator } from "./toECDSAValidatorPlugin.js"

export { signerToEcdsaValidator, type KernelPlugin }

export const ECDSA_VALIDATOR_ADDRESS =
    "0xd9AB5096a832b9ce79914329DAEE236f8Eea0390"
