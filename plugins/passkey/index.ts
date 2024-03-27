import type { KernelValidator } from "@zerodev/sdk/types"
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
    "0xC9aC0B878BFbd8Ead820Cc58bE4AB18Bf9786eeF"
