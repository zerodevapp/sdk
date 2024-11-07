import {
    satisfiesRange,
    validateKernelVersionWithEntryPoint
} from "@zerodev/sdk"
import type { GetKernelVersion, KernelValidator } from "@zerodev/sdk/types"
import { WebAuthnMode, toWebAuthnKey } from "@zerodev/webauthn-key"
import { type Address, zeroAddress } from "viem"
import {
    PasskeyValidatorContractVersion,
    deserializePasskeyValidator,
    toPasskeyValidator
} from "./toPasskeyValidator.js"
import type { EntryPointVersion } from "viem/account-abstraction";

export {
    deserializePasskeyValidator,
    toPasskeyValidator,
    toWebAuthnKey,
    type KernelValidator,
    WebAuthnMode,
    PasskeyValidatorContractVersion
}

export const kernelVersionRangeToContractVersionToValidator: {
    [key: string]: { [key: string]: Address }
} = {
    "0.0.2 - 0.2.4": {
        "0.0.1": "0x1e02Ff20b604C2B2809193917Ea22D8602126837"
    },
    "0.3.0 || 0.3.1": {
        "0.0.1": "0xD990393C670dCcE8b4d8F858FB98c9912dBFAa06",
        "0.0.2": "0xbA45a2BFb8De3D24cA9D7F1B551E14dFF5d690Fd"
    }
}

export const getValidatorAddress = <entryPointVersion extends EntryPointVersion>(
    entryPoint: { address: Address; version: entryPointVersion },
    kernelVersion: GetKernelVersion<entryPointVersion>,
    validatorContractVersion: PasskeyValidatorContractVersion,
    validatorAddress?: Address
): Address => {
    validateKernelVersionWithEntryPoint(entryPoint.version, kernelVersion)
    const passKeyValidatorAddress = Object.entries(
        kernelVersionRangeToContractVersionToValidator
    ).find(([range]) => satisfiesRange(kernelVersion, range))?.[1]?.[
        validatorContractVersion
    ]

    if (!passKeyValidatorAddress && !validatorAddress) {
        throw new Error(
            `Validator not found for Kernel version: ${kernelVersion}`
        )
    }

    return validatorAddress ?? passKeyValidatorAddress ?? zeroAddress
}
