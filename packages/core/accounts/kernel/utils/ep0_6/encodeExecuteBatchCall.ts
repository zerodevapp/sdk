import { encodeFunctionData } from "viem"
import { KernelExecuteAbi } from "../../abi/KernelAccountAbi.js"
import type { CallArgs } from "../types.js"

export const encodeExecuteBatchCall = (args: CallArgs[]) => {
    return encodeFunctionData({
        abi: KernelExecuteAbi,
        functionName: "executeBatch",
        args: [
            args.map((arg) => {
                return {
                    to: arg.to,
                    value: arg.value,
                    data: arg.data
                }
            })
        ]
    })
}
