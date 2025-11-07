import type { EntryPointVersion } from "viem/account-abstraction"
import { EXEC_TYPE } from "../../../../../constants.js"
import type { CallType } from "../../../../../types/kernel.js"
import type { KernelSmartAccountImplementation } from "../../../createKernelAccount.js"
import { encodeExecuteBatchCall } from "../../ep0_7/encodeExecuteBatchCall.js"
import { encodeExecuteDelegateCall } from "../../ep0_7/encodeExecuteDelegateCall.js"
import { encodeExecuteSingleCall } from "../../ep0_7/encodeExecuteSingleCall.js"

export const encodeCallData = async <
    entryPointVersion extends EntryPointVersion = EntryPointVersion
>(
    calls: Parameters<
        KernelSmartAccountImplementation<entryPointVersion>["encodeCalls"]
    >[0],
    callType?: CallType | undefined,
    includeHooks?: boolean,
    execType: EXEC_TYPE = EXEC_TYPE.DEFAULT
) => {
    if (calls.length > 1) {
        if (callType === "delegatecall") {
            throw new Error("Cannot batch delegatecall")
        }
        // Encode a batched call
        return encodeExecuteBatchCall(
            calls,
            {
                execType
            },
            includeHooks
        )
    }

    const call = calls.length === 0 ? undefined : calls[0]

    if (!call) {
        throw new Error("No calls to encode")
    }

    // Default to `call`
    if (!callType || callType === "call") {
        return encodeExecuteSingleCall(
            call,
            {
                execType
            },
            includeHooks
        )
    }

    if (callType === "delegatecall") {
        return encodeExecuteDelegateCall(
            { to: call.to, data: call.data },
            {
                execType
            },
            includeHooks
        )
    }

    throw new Error("Invalid call type")
}
