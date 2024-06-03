import { CALL_TYPE } from "../../../../constants.js"
import type { CallArgs } from "../types.js"
import {
    type EncodeExecuteOptions,
    encodeExecuteCall
} from "./encodeExecuteCall.js"

export const encodeExecuteSingleCall = (
    args: CallArgs,
    options: Omit<EncodeExecuteOptions, "callType">,
    includeHooks?: boolean
) => {
    return encodeExecuteCall(
        args,
        {
            callType: CALL_TYPE.SINGLE,
            execType: options.execType
        },
        includeHooks
    )
}
