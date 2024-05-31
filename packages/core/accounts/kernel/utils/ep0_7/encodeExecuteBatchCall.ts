import { encodeAbiParameters } from "viem"
import { CALL_TYPE } from "../../../../constants.js"
import type { CallArgs } from "../types.js"
import {
    type EncodeExecuteOptions,
    encodeExecuteCall
} from "./encodeExecuteCall.js"

export const encodeExecuteBatchCall = (
    args: CallArgs[],
    options: Omit<EncodeExecuteOptions, "callType">,
    includeHooks?: boolean
) => {
    const calldata = encodeAbiParameters(
        [
            {
                name: "executionBatch",
                type: "tuple[]",
                components: [
                    {
                        name: "target",
                        type: "address"
                    },
                    {
                        name: "value",
                        type: "uint256"
                    },
                    {
                        name: "callData",
                        type: "bytes"
                    }
                ]
            }
        ],
        [
            args.map((arg) => {
                return {
                    target: arg.to,
                    value: arg.value,
                    callData: arg.data
                }
            })
        ]
    )
    return encodeExecuteCall(
        { calldata },
        {
            callType: CALL_TYPE.BATCH,
            execType: options.execType
        },
        includeHooks
    )
}
