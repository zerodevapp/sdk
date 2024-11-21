import { slice, type Hex } from "viem"
import { decodeExecuteCallParams } from "./decodeExecuteCallParams"
import { CALL_TYPE } from "../../../../constants"
import { decodeExecuteBatchCall } from "./decodeExecuteBatchCall"
import type { Call } from "../../../../types/kernel.js";

export function decodeExecuteCall(data: Hex): Call[] {
    const { execMode, executionCallData } = decodeExecuteCallParams(data)
    if (execMode.callType === CALL_TYPE.SINGLE) {
        return [{
            to: slice(executionCallData, 0, 20),
            value: BigInt(slice(executionCallData, 20, 32)),
            data: slice(executionCallData, 32),
            callType: "call"
        }]
    }

    if (execMode.callType === CALL_TYPE.DELEGATE_CALL) {
        return [{
            to: slice(executionCallData, 0, 20),
            value: 0n,
            data: slice(executionCallData, 20),
            callType: "delegatecall"
        }]
    }

    return [...decodeExecuteBatchCall(executionCallData)]
}
