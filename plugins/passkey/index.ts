import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createPasskeyValidator,
    getPasskeyValidator
} from "./toPasskeyValidator.js"

export { createPasskeyValidator, getPasskeyValidator, type KernelValidator }

export const WEBAUTHN_VALIDATOR_ADDRESS =
    "0xbE26649eEB972db5b93b2Aba98f9F6060b14d7cC"
