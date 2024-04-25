import type { toSmartAccount } from "permissionless/accounts"
import { encodeDeployData } from "viem"
import { safeCreateCallAddress } from "../../../../../constants.js"
import { encodeSafeCreateCall } from "../../common/encodeSafeCreateCall.js"
import { encodeExecuteDelegateCall } from "../../ep0_6/encodeExecuteDelegateCall.js"
import type { DelegateCallArgs } from "../../types.js"

export const encodeDeployCallData = (
    tx: Parameters<
        Parameters<typeof toSmartAccount>[0]["encodeDeployCallData"]
    >[0]
) => {
    const deployCalldataArgs: DelegateCallArgs = {
        to: safeCreateCallAddress,
        data: encodeSafeCreateCall([0n, encodeDeployData(tx)])
    }
    return encodeExecuteDelegateCall(deployCalldataArgs)
}
