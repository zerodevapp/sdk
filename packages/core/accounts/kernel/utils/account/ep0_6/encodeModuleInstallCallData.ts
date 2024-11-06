import { type Address, type Hex, encodeFunctionData } from "viem"
import type { PluginInstallData } from "../../../../../types/kernel.js"
import { KernelAccountAbi } from "../../../abi/KernelAccountAbi.js"
import { encodeCallData } from "./encodeCallData.js"

export const encodeModuleInstallCallData = async ({
    accountAddress,
    enableData,
    executor,
    selector,
    validAfter,
    validUntil,
    validator
}: {
    accountAddress: Address
} & PluginInstallData<"0.6">): Promise<Hex> => {
    return encodeCallData(
        [
            {
                to: accountAddress,
                value: 0n,
                data: encodeFunctionData({
                    abi: KernelAccountAbi,
                    functionName: "setExecution",
                    args: [
                        selector,
                        executor,
                        validator,
                        validUntil,
                        validAfter,
                        enableData
                    ]
                })
            }
        ],
        "call"
    )
}
