import type { KernelValidator } from "@zerodev/sdk/types"
import {
  createPasskeyValidator,
  getPasskeyValidator,
} from "./toPasskeyValidator.js"

export { createPasskeyValidator, getPasskeyValidator, type KernelValidator }

export const WEBAUTHN_VALIDATOR_ADDRESS =
  "0x3a0980D497F908fE5eaA5505af85C10911a718FD"
