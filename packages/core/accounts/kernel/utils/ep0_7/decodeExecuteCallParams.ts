import { decodeFunctionData, type Hex } from "viem"
import { KernelV3ExecuteAbi } from "../../abi/kernel_v_3_0_0/KernelAccountAbi.js"
import type { CALL_TYPE, EXEC_TYPE } from "../../../../constants.js"
import { getExexModeTypes } from "../../../../utils.js"

export function decodeExecuteCallParams(data: Hex): {
    execMode: { callType: CALL_TYPE; execType: EXEC_TYPE }
    executionCallData: Hex
} {
    const decodedData = decodeFunctionData({
        abi: KernelV3ExecuteAbi,
        data
    })
    if (decodedData.functionName === "execute") {
        const execMode = getExexModeTypes(decodedData.args[0])
        return {
            execMode,
            executionCallData: decodedData.args[1]
        }
    }
    throw Error("Not an execute calldata")
}
