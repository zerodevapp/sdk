import {
    type KernelSmartAccountImplementation,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { http, type PublicClient, createPublicClient } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { CHAINS, type ChainKey, type Project, zerodevRpc } from "./env"

export type KernelAccount = SmartAccount<KernelSmartAccountImplementation>

type Fees = { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }

export function getPublicClient(key: ChainKey): PublicClient {
    return createPublicClient({
        chain: CHAINS[key].chain,
        transport: http(CHAINS[key].rpcUrl)
    })
}

// Default wiring is the documented SDK setup: fees from
// zd_getUserOperationGasPrice and sponsorship via zd_sponsorUserOperation.
export function getKernelClient(
    account: KernelAccount,
    key: ChainKey,
    {
        paymaster = "sponsor",
        project = "sponsored",
        estimateFeesPerGas
    }: {
        paymaster?: "sponsor" | "none"
        project?: Project
        estimateFeesPerGas?: () => Promise<Fees>
    } = {}
) {
    const chain = CHAINS[key].chain
    const rpc = zerodevRpc(key, project)
    const paymasterClient = createZeroDevPaymasterClient({
        chain,
        transport: http(rpc)
    })
    return createKernelAccountClient({
        account,
        chain,
        client: getPublicClient(key),
        bundlerTransport: http(rpc),
        paymaster:
            paymaster === "sponsor"
                ? {
                      getPaymasterData: (userOperation) =>
                          paymasterClient.sponsorUserOperation({
                              userOperation
                          })
                  }
                : undefined,
        userOperation: estimateFeesPerGas ? { estimateFeesPerGas } : undefined
    })
}
