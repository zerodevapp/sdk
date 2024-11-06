import { type Hex, getAbiItem, toFunctionSelector } from "viem"
import type { EntryPointVersion } from "viem/account-abstraction"
import { KernelAccountAbi } from "../../abi/KernelAccountAbi.js"
import { KernelV3AccountAbi } from "../../abi/kernel_v_3_0_0/KernelAccountAbi.js"

export const getActionSelector = (
    entryPointVersion: EntryPointVersion
): Hex => {
    if (entryPointVersion === "0.6") {
        return toFunctionSelector(
            getAbiItem({ abi: KernelAccountAbi, name: "execute" })
        )
    } else if (entryPointVersion === "0.7") {
        return toFunctionSelector(
            getAbiItem({ abi: KernelV3AccountAbi, name: "execute" })
        )
    } else {
        throw new Error("Unsupported entry point version")
    }
}
