import { constants } from "@zerodev/sdk"
import { CALL_TYPE, PLUGIN_TYPE } from "@zerodev/sdk/constants"
import type { Action, PluginMigrationData } from "@zerodev/sdk/types"
import {
    concatHex,
    encodeAbiParameters,
    parseAbiParameters,
    toFunctionSelector,
    zeroAddress
} from "viem"
import type { EntryPointVersion } from "viem/account-abstraction"

const RECOVERY_ACTION_ADDRESS_V06 = "0x2f65dB8039fe5CAEE0a8680D2879deB800F31Ae1"
const RECOVERY_ACTION_ADDRESS_V07 = "0xe884C2868CC82c16177eC73a93f7D9E6F3A5DC6E"
const RECOVERY_ACTION_SELECTOR = toFunctionSelector(
    "doRecovery(address, bytes)"
)

export const getRecoveryAction = (
    entryPointVersion: EntryPointVersion
): Action => {
    if (entryPointVersion === "0.6") {
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

export const getRecoveryFallbackActionInstallModuleData = (
    entryPointVersion: EntryPointVersion
): PluginMigrationData => {
    const recoveryAction = getRecoveryAction(entryPointVersion)
    return {
        address: recoveryAction.address,
        type: PLUGIN_TYPE.FALLBACK,
        data: concatHex([
            recoveryAction.selector,
            zeroAddress,
            encodeAbiParameters(
                parseAbiParameters("bytes selectorData, bytes hookData"),
                [CALL_TYPE.DELEGATE_CALL, "0x"]
            )
        ])
    }
}

export const WEIGHTED_VALIDATOR_ADDRESS_V07 =
    "0x2E29537bBaf8AB5dC8037Fa4Bc3DEB2c289498A3"

export const WEIGHTED_VALIDATOR_ADDRESS_V07_V_0_0_2 =
    "0x144F02c15a8CB2E01D35bf2af8e9eFD96401e44b"

export enum SIGNER_TYPE {
    ECDSA = "0x01",
    PASSKEY = "0x02"
}
