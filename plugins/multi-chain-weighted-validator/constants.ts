import { constants } from "@zerodev/sdk"
import type { Action } from "@zerodev/sdk/types"
import { getEntryPointVersion } from "permissionless"
import type { EntryPoint } from "permissionless/types/entrypoint"
import { toFunctionSelector } from "viem"

const RECOVERY_ACTION_ADDRESS_V06 = "0x2f65dB8039fe5CAEE0a8680D2879deB800F31Ae1"
const RECOVERY_ACTION_ADDRESS_V07 = "0xe884C2868CC82c16177eC73a93f7D9E6F3A5DC6E"
const RECOVERY_ACTION_SELECTOR = toFunctionSelector(
    "doRecovery(address, bytes)"
)

export const getRecoveryAction = (entryPoint: EntryPoint): Action => {
    const entryPointVersion = getEntryPointVersion(entryPoint)
    if (entryPointVersion === "v0.6") {
        return {
            address: RECOVERY_ACTION_ADDRESS_V06,
            selector: RECOVERY_ACTION_SELECTOR
        }
    }
    return {
        address: RECOVERY_ACTION_ADDRESS_V07,
        selector: RECOVERY_ACTION_SELECTOR,
        hook: {
            address: constants.ONLY_ENTRYPOINT_HOOK_ADDRESS
        }
    }
}

export const MULTI_CHAIN_WEIGHTED_VALIDATOR_ADDRESS_V07 =
    "0xA99cD3c93773dA7f321A28a97648b608f347E6A1"

export enum SIGNER_TYPE {
    ECDSA = "0x01",
    PASSKEY = "0x02"
}
