import type { EntryPointVersion } from "permissionless/types/entrypoint"
import { type Hex, getAbiItem, toFunctionSelector } from "viem"
import { KernelAccountAbi } from "../../abi/KernelAccountAbi.js"
import { KernelV3AccountAbi } from "../../abi/kernel_v_3_0_0/KernelAccountAbi.js"

export const getActionSelector = (
    entryPointVersion: EntryPointVersion
): Hex => {
    if (entryPointVersion === "v0.6") {
        return toFunctionSelector(
            getAbiItem({ abi: KernelAccountAbi, name: "execute" })
        )
    } else if (entryPointVersion === "v0.7") {
        return toFunctionSelector(
            getAbiItem({ abi: KernelV3AccountAbi, name: "execute" })
        )
    } else {
        throw new Error("Unsupported entry point version")
    }
}
