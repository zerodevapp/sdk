import { encodeDeployData } from "viem"
import type { EntryPointVersion } from "viem/account-abstraction"
import { EXEC_TYPE, safeCreateCallAddress } from "../../../../../constants.js"
import type { KernelSmartAccountImplementation } from "../../../createKernelAccount.js"
import { encodeSafeCreateCall } from "../../common/encodeSafeCreateCall.js"
import { encodeExecuteDelegateCall } from "../../ep0_7/encodeExecuteDelegateCall.js"
import type { DelegateCallArgs } from "../../types.js"

export const encodeDeployCallData = <
    entryPointVersion extends EntryPointVersion = EntryPointVersion
>(
    tx: Parameters<
        KernelSmartAccountImplementation<entryPointVersion>["encodeDeployCallData"]
    >[0]
) => {
    const deployCalldataArgs: DelegateCallArgs = {
        to: safeCreateCallAddress,
        data: encodeSafeCreateCall([0n, encodeDeployData(tx)])
    }
    return encodeExecuteDelegateCall(deployCalldataArgs, {
        execType: EXEC_TYPE.DEFAULT
    })
}
