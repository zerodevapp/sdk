import {
    satisfiesRange,
    validateKernelVersionWithEntryPoint
} from "@zerodev/sdk"
import type { GetKernelVersion, KernelValidator } from "@zerodev/sdk/types"
import type { EntryPoint } from "permissionless/types/entrypoint.js"
import { type Address, zeroAddress } from "viem"
import {
    deserializePasskeyValidator,
    toPasskeyValidator
} from "./toPasskeyValidator.js"
import { WebAuthnMode, toWebAuthnKey } from "./toWebAuthnKey.js"

export {
    deserializePasskeyValidator,
    toPasskeyValidator,
    toWebAuthnKey,
    type KernelValidator,
    WebAuthnMode
}

export const kernelVersionRangeToValidator: {
    [key: string]: Address
} = {
    "0.0.2 - 0.2.4": "0x1e02Ff20b604C2B2809193917Ea22D8602126837",
    "0.3.0 || 0.3.1": "0xD990393C670dCcE8b4d8F858FB98c9912dBFAa06"
}

export const getValidatorAddress = <entryPoint extends EntryPoint>(
    entryPointAddress: entryPoint,
    kernelVersion: GetKernelVersion<entryPoint>,
    validatorAddress?: Address
): Address => {
    validateKernelVersionWithEntryPoint(entryPointAddress, kernelVersion)
    const passKeyValidatorAddress = Object.entries(
        kernelVersionRangeToValidator
    ).find(([range]) => satisfiesRange(kernelVersion, range))?.[1]

    if (!passKeyValidatorAddress && !validatorAddress) {
        throw new Error(
            `Validator not found for Kernel version: ${kernelVersion}`
        )
    }

    return validatorAddress ?? passKeyValidatorAddress ?? zeroAddress
}
