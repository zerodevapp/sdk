import type { KernelValidator } from "@zerodev/sdk/types"
import { getEntryPointVersion } from "permissionless"
import type { EntryPoint } from "permissionless/types/entrypoint.js"
import {
    createPasskeyValidator,
    deserializePasskeyValidator,
    getPasskeyValidator
} from "./toPasskeyValidator.js"

export {
    deserializePasskeyValidator,
    createPasskeyValidator,
    getPasskeyValidator,
    type KernelValidator
}

export const WEBAUTHN_VALIDATOR_ADDRESS_V06 =
    "0x3a0980D497F908fE5eaA5505af85C10911a718FD"

export const WEBAUTHN_VALIDATOR_ADDRESS_V07 =
    "0xD990393C670dCcE8b4d8F858FB98c9912dBFAa06"

export const getValidatorAddress = (entryPointAddress: EntryPoint) => {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)
    return entryPointVersion === "v0.6"
        ? WEBAUTHN_VALIDATOR_ADDRESS_V06
        : WEBAUTHN_VALIDATOR_ADDRESS_V07
}
