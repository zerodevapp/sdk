import { type Hex, concatHex, encodeFunctionData, toHex } from "viem"
import { CALL_TYPE } from "../../../../constants.js"
import { getExecMode } from "../../../../utils.js"
import { KernelV3ExecuteAbi } from "../../abi/kernel_v_3_0_0/KernelAccountAbi.js"
import type { CallArgs, DelegateCallArgs } from "../types.js"

export type EncodeExecuteOptions = Parameters<typeof getExecMode>[0]

type EncodeExecuteCallArgs<TOptions> =
    | (TOptions extends {
          callType: CALL_TYPE.DELEGATE_CALL
      }
          ? DelegateCallArgs
          : CallArgs)
    | { calldata: Hex }

export const encodeExecuteCall = <TOptions extends EncodeExecuteOptions>(
    args: EncodeExecuteCallArgs<TOptions>,
    options: TOptions
) => {
    let calldata: Hex
    if ("calldata" in args) {
        calldata = args.calldata
    } else {
        calldata = concatHex([
            args.to,
            options.callType !== CALL_TYPE.DELEGATE_CALL
                ? toHex(args.value, { size: 32 })
                : "0x", // No value if delegate call
            args.data
        ])
    }
    return encodeFunctionData({
        abi: KernelV3ExecuteAbi,
        functionName: "execute",
        args: [getExecMode(options), calldata]
    })
}
