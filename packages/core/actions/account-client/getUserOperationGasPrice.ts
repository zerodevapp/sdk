import type { Account, Chain, Client, Transport } from "viem"
import { getBlock, getChainId } from "viem/actions"
import { type Prettify, arbitrum } from "viem/chains"
import { isProviderSet } from "../../clients/utils.js"
import type { ZeroDevAccountClientRpcSchema } from "../../types/kernel.js"

export type GetUserOperationGasPriceReturnType = {
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
}

export const getUserOperationGasPrice = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined
>(
    client: Client<TTransport, TChain, TAccount, ZeroDevAccountClientRpcSchema>
): Promise<Prettify<GetUserOperationGasPriceReturnType>> => {
    if (
        client.transport?.url &&
        (isProviderSet(client.transport.url, "ALCHEMY") ||
            isProviderSet(client.transport.url, "ZERODEV") ||
            isProviderSet(client.transport.url, "CONDUIT"))
    ) {
        const [fee, block] = await Promise.all([
            client.request({
                // @ts-ignore
                method: "rundler_maxPriorityFeePerGas",
                params: []
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            }) as any,
            // @ts-ignore
            getBlock(client?.client as typeof client ?? client, { blockTag: "latest" })
        ])
        const chainId = client.chain
            ? client.chain.id
            // @ts-ignore
            : await getChainId(client?.client as typeof client ?? client)
        const baseFeeMultiplier = chainId === arbitrum.id ? 1.05 : 1.5
        const priorityFeeMultiplier = chainId === arbitrum.id ? 1.0 : 1.25
        const denominator = 100
        const multiply = (base: bigint, multiplier: number) =>
            (base * BigInt(multiplier * denominator)) / BigInt(denominator)

        const maxPriorityFeePerGas = multiply(
            BigInt(fee),
            priorityFeeMultiplier
        )

        const baseFeePerGas = multiply(block.baseFeePerGas, baseFeeMultiplier)
        const maxFeePerGas = baseFeePerGas + maxPriorityFeePerGas

        return { maxFeePerGas, maxPriorityFeePerGas }
    }

    const gasPrice = await client.request({
        method: "zd_getUserOperationGasPrice",
        params: []
    })

    return {
        maxFeePerGas: BigInt(gasPrice.standard.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(gasPrice.standard.maxPriorityFeePerGas)
    }
}
