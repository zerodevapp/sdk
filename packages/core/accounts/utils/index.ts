import { toKernelPluginManager } from "./toKernelPluginManager.js"
export { toKernelPluginManager }

import type { Address, Hex } from "viem"
import { verifyEIP6492Signature } from "./6492.js"
export { verifyEIP6492Signature }

export const parseFactoryAddressAndCallDataFromAccountInitCode = (
    initCode: Hex
): [Address, Hex] => {
    const factoryAddress = `0x${initCode.substring(2, 42)}` as Address
    const factoryCalldata = `0x${initCode.substring(42)}` as Hex
    return [factoryAddress, factoryCalldata]
}
