import { CALL_TYPE } from "../../../../constants.js"
import type { DelegateCallArgs } from "../types.js"
import {
    type EncodeExecuteOptions,
    encodeExecuteCall
} from "./encodeExecuteCall.js"

export const encodeExecuteDelegateCall = (
    args: DelegateCallArgs,
    options: Omit<EncodeExecuteOptions, "callType">,
    includeHooks?: boolean
) => {
    return encodeExecuteCall(
        args,
        {
            callType: CALL_TYPE.DELEGATE_CALL,
            execType: options.execType
        },
        includeHooks
    )
}
