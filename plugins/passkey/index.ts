import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createPasskeyValidator,
    getPasskeyValidator
} from "./toWebAuthnValidator.js"

export { createPasskeyValidator, getPasskeyValidator, type KernelValidator }

export const WEBAUTHN_VALIDATOR_ADDRESS =
    "0xe0B64Ef87F0009C24856C1F21b85814Ec781468E"
