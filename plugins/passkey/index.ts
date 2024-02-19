import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createPasskeyValidator,
    getPasskeyValidator
} from "./toWebAuthnValidator.js"

export { createPasskeyValidator, getPasskeyValidator, type KernelValidator }

export const WEBAUTHN_VALIDATOR_ADDRESS =
    "0x0Bc1C061878deAb416B2249D6009D07A72E367C3"
