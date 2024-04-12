export { toKernelPluginManager } from "./toKernelPluginManager.js"

import type { Address, Hex } from "viem"
export { verifyEIP6492Signature, universalValidatorByteCode } from "./6492.js"

export const parseFactoryAddressAndCallDataFromAccountInitCode = (
    initCode: Hex
): [Address, Hex] => {
    const factoryAddress = `0x${initCode.substring(2, 42)}` as Address
    const factoryCalldata = `0x${initCode.substring(42)}` as Hex
    return [factoryAddress, factoryCalldata]
}

export { getCustomNonceKeyFromString } from "./getCustomNonceKeyFromString.js"
