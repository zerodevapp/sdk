import type { Account, Chain, Client, Transport } from "viem"
import type { Prettify } from "viem/chains"
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
    client: Client<TTransport, TChain, TAccount, ZeroDevAccountClientRpcSchema>,
    provider: string
): Promise<Prettify<GetUserOperationGasPriceReturnType>> => {
    if (provider === "PIMLICO") {
        const gasPrice = await client.request({
            method: "zd_getPimlicoUserOperationGasPrice",
            params: []
        })

        return {
            maxFeePerGas: BigInt(gasPrice.standard.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(gasPrice.standard.maxPriorityFeePerGas)
        }
    }

    if (provider === "THIRDWEB") {
        const gasPrice = await client.request({
            method: "zd_getThirdwebUserOperationGasPrice",
            params: []
        })

        return {
            maxFeePerGas: BigInt(gasPrice.fast.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(gasPrice.fast.maxPriorityFeePerGas)
        }
    }

    throw new Error(
        `Unsupported provider: ${provider}, please use "PIMLICO" or "THIRDWEB"`
    )
}
