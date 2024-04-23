import type { Account, Chain, Client, Transport } from "viem"
import type { Prettify } from "viem/chains"
import type {
    PimlicoClientRpcSchema,
    ZeroDevAccountClientRpcSchema
} from "../../types/kernel.js"

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
    const gasPrice = await client.request({
        method: "zd_getUserOperationGasPrice",
        params: []
    })

    return {
        maxFeePerGas: BigInt(gasPrice.standard.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(gasPrice.standard.maxPriorityFeePerGas)
    }
}

export const pimlicoGetUserOperationGasPrice = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined
>(
    client: Client<TTransport, TChain, TAccount, PimlicoClientRpcSchema>
): Promise<Prettify<GetUserOperationGasPriceReturnType>> => {
    const gasPrice = await client.request({
        method: "pimlico_getUserOperationGasPrice",
        params: []
    })

    return {
        maxFeePerGas: BigInt(gasPrice.standard.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(gasPrice.standard.maxPriorityFeePerGas)
    }
}
