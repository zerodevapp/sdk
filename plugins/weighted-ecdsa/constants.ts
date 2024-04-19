import type { Action } from "@zerodev/sdk/types"
import { toFunctionSelector } from "viem"

const RECOVERY_ACTION_ADDRESS = "0x2f65dB8039fe5CAEE0a8680D2879deB800F31Ae1"
const RECOVERY_ACTION_SELECTOR = toFunctionSelector(
    "doRecovery(address, bytes)"
)

export const getRecoveryAction = (): Action => {
    return {
        address: RECOVERY_ACTION_ADDRESS,
        selector: RECOVERY_ACTION_SELECTOR
    }
}

export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS_V06 =
    "0x8012D9ee59176Cb01a4aa80fCFE6f5E8bA58d4fb"

export const WEIGHTED_ECDSA_VALIDATOR_ADDRESS_V07 =
    "0x750Fe8F6FE28b9F2Bd89B4B195c4a9f5D9F5fAa1"
