import {
    type Address,
    type Hex,
    encodeFunctionData,
    erc20Abi,
    hexToSignature,
    isHex,
    signatureToHex,
    zeroAddress
} from "viem"
import { KERNEL_ADDRESSES } from "./accounts/index.js"
import type { ZeroDevPaymasterClient } from "./clients/paymasterClient.js"
import { KernelImplToVersionMap, LATEST_KERNEL_VERSION } from "./constants.js"

export const getKernelVersion = (kernelImpl?: Address): string => {
    if (!kernelImpl || kernelImpl === zeroAddress) return LATEST_KERNEL_VERSION
    for (const [addr, ver] of Object.entries(KernelImplToVersionMap)) {
        if (addr.toLowerCase() === kernelImpl.toLowerCase()) return ver
    }
    return "0.2.1"
}

export const getERC20PaymasterApproveCall = async (
    client: ZeroDevPaymasterClient,
    {
        gasToken,
        approveAmount
    }: {
        gasToken: Address
        approveAmount: bigint
    }
): Promise<{ to: Address; value: bigint; data: Hex }> => {
    const response = await client.request({
        method: "zd_pm_accounts",
        params: [
            {
                chainId: client.chain?.id as number,
                entryPointAddress: KERNEL_ADDRESSES.ENTRYPOINT_V0_6
            }
        ]
    })
    return {
        to: gasToken,
        data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [response[0], approveAmount]
        }),
        value: 0n
    }
}

export const fixSignedData = (sig: Hex): Hex => {
    let signature = sig
    if (!isHex(signature)) {
        signature = `0x${signature}`
        if (!isHex(signature)) {
            throw new Error(`Invalid signed data ${sig}`)
        }
    }

    let { r, s, v } = hexToSignature(signature)
    if (v === 0n || v === 1n) v += 27n
    const joined = signatureToHex({ r, s, v })
    return joined
}
