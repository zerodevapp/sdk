import { satisfiesRange } from "@zerodev/sdk"
import {
    encodeExecuteBatchCallV06,
    encodeExecuteBatchCallV07,
    encodeExecuteSingleCallV06,
    encodeExecuteSingleCallV07
} from "@zerodev/sdk/accounts"
import { EXEC_TYPE } from "@zerodev/sdk/constants"
import type { KERNEL_VERSION_TYPE } from "@zerodev/sdk/types"
import type { EncodeExecute } from "../vendor/eip8130/index.js"

/**
 * EIP-8130 wire calls carry no value, so viem routes value-bearing phases
 * through the account's own bytecode. For Kernel that is an `execute`
 * self-call: `msg.sender == address(this)` satisfies Kernel's
 * `onlyEntryPointOrSelfOrRoot`. Value-less phases stay direct calls.
 */
export const kernelEncodeExecute = (
    kernelVersion: KERNEL_VERSION_TYPE
): EncodeExecute => {
    const isV3 = satisfiesRange(kernelVersion, ">=0.3.0")
    return ({ account, calls }) => {
        const [call] = calls
        const data = isV3
            ? calls.length === 1
                ? encodeExecuteSingleCallV07(call, {
                      execType: EXEC_TYPE.DEFAULT
                  })
                : encodeExecuteBatchCallV07(calls, {
                      execType: EXEC_TYPE.DEFAULT
                  })
            : calls.length === 1
              ? encodeExecuteSingleCallV06(call)
              : encodeExecuteBatchCallV06(calls)
        return { to: account, data }
    }
}
