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
        selector: RECOVERY_ACTION_SELECTOR
    }
}

export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS_V06 =
    "0x8012D9ee59176Cb01a4aa80fCFE6f5E8bA58d4fb"

export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS_V07 =
    "0xeD89244160CfE273800B58b1B534031699dFeEEE"
