import { walletClientToCustomSigner } from "permissionless"
import {
    type Address,
    type Hex,
    type WalletClient,
    createWalletClient,
    custom,
    encodeFunctionData,
    erc20Abi,
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

interface EIP1193Provider {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    request(args: { method: string; params?: Array<any> }): Promise<any>
}

export const providerToSmartAccountSigner = async (
    provider: EIP1193Provider
) => {
    const [account] = await provider.request({ method: "eth_requestAccounts" })
    const walletClient = createWalletClient({
        account: account as Hex,
        transport: custom(provider)
    })
    return walletClientToCustomSigner(walletClient)
}

export const walletClientToSmartAccountSigner = (
    walletClient: WalletClient
) => {
    // biome-ignore lint/suspicious/noExplicitAny: I believe this type error is because of a version mismatch between viem and permissionless
    return walletClientToCustomSigner(walletClient as any)
}

export const getERC20PaymasterApproveData = async (
    client: ZeroDevPaymasterClient,
    {
        tokenAddress,
        approveAmount
    }: {
        tokenAddress: Address
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
        to: tokenAddress,
        data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [response[0], approveAmount]
        }),
        value: 0n
    }
}
