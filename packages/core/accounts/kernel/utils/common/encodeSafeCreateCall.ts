import { encodeFunctionData } from "viem"
import { SafeCreateCallAbi } from "../../abi/SafeCreateCallAbi.js"

type EncodeExecuteDelegateCallArgs = Parameters<
    typeof encodeFunctionData<typeof SafeCreateCallAbi, "performCreate">
>[0]["args"]

export const encodeSafeCreateCall = (args: EncodeExecuteDelegateCallArgs) => {
    return encodeFunctionData({
        abi: SafeCreateCallAbi,
        functionName: "performCreate",
        args
    })
}
