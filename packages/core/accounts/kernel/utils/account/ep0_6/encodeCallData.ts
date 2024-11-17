import type { EntryPointVersion } from "viem/account-abstraction"
import type { CallType } from "../../../../../types/kernel.js"
import type { KernelSmartAccountImplementation } from "../../../createKernelAccount.js"
import { encodeExecuteBatchCall } from "../../ep0_6/encodeExecuteBatchCall.js"
import { encodeExecuteDelegateCall } from "../../ep0_6/encodeExecuteDelegateCall.js"
import { encodeExecuteSingleCall } from "../../ep0_6/encodeExecuteSingleCall.js"

export const encodeCallData = async <
    entryPointVersion extends EntryPointVersion = EntryPointVersion
>(
    calls: Parameters<
        KernelSmartAccountImplementation<entryPointVersion>["encodeCalls"]
    >[0],
    callType?: CallType | undefined
) => {
    if (calls.length > 1) {
        if (callType === "delegatecall") {
            throw new Error("Cannot batch delegatecall")
        }
        return encodeExecuteBatchCall(calls)
    }

    const call = calls.length === 0 ? undefined : calls[0]

    if (!call) {
        throw new Error("No calls to encode")
    }

    // Default to `call`
    if (!callType || callType === "call") {
        return encodeExecuteSingleCall(call)
    }

    if (callType === "delegatecall") {
        return encodeExecuteDelegateCall({
            to: call.to,
            data: call.data
        })
    }

    throw new Error("Invalid call type")
}
