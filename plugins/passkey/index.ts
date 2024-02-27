import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createPasskeyValidator,
    getPasskeyValidator
} from "./toPasskeyValidator.js"

export { createPasskeyValidator, getPasskeyValidator, type KernelValidator }

export const WEBAUTHN_VALIDATOR_ADDRESS =
    "0x01272b9d6c9321BD4146531c2874111E86e39f96"
