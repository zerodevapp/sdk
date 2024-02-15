import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createPasskeyValidator,
    getPasskeyValidator
} from "./toWebAuthnValidator.js"

export { createPasskeyValidator, getPasskeyValidator, type KernelValidator }

export const WEBAUTHN_VALIDATOR_ADDRESS =
    "0xc674445044879f744e7ABC987902F58c4C59c46e"
