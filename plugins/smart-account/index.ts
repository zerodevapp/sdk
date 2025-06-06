import type { KernelValidator } from "@zerodev/sdk/types"
import {
    getValidatorAddress,
    signerToSmartAccountValidator
} from "./toSmartAccountValidatorPlugin.js"

export {
    getValidatorAddress,
    signerToSmartAccountValidator,
    type KernelValidator
}
export * from "./constants.js"
