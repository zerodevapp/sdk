import { encodeFunctionData } from "viem"
import { KernelExecuteAbi } from "../../abi/KernelAccountAbi.js"
import type { DelegateCallArgs } from "../types.js"

export const encodeExecuteDelegateCall = (args: DelegateCallArgs) => {
    return encodeFunctionData({
        abi: KernelExecuteAbi,
        functionName: "executeDelegateCall",
        args: [args.to, args.data]
    })
}
