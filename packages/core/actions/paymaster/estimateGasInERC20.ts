import type { Address, Hex } from "viem"
import {
    type EntryPointVersion,
    type UserOperation,
    entryPoint06Address
} from "viem/account-abstraction"
import type { ZeroDevPaymasterClient } from "../../clients/paymasterClient.js"
import { deepHexlify } from "../../utils.js"

export type EstimateGasInERC20Parameters = {
    userOperation: UserOperation
    gasTokenAddress: Hex
    entryPoint: Address
}

export type GetERC20TokenQuotesReturnType = {
    maxGasCostToken: string
    tokenDecimals: string
}

export type EstimateGasInERC20ReturnType = {
    amount: number
}

/**
 * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
 */

export const estimateGasInERC20 = async <
    entryPointVersion extends EntryPointVersion
>(
    client: ZeroDevPaymasterClient<entryPointVersion>,
    args: EstimateGasInERC20Parameters
): Promise<EstimateGasInERC20ReturnType> => {
    const response = await client.request({
        method: "stackup_getERC20TokenQuotes",
        params: [
            {
                chainId: client.chain?.id as number,
                userOp: {
                    ...deepHexlify(args.userOperation),
                    initCode: args.userOperation.initCode || "0x"
                },
                tokenAddress: args.gasTokenAddress,
                entryPointAddress: args.entryPoint ?? entryPoint06Address
            }
        ]
    })

    const result: GetERC20TokenQuotesReturnType = {
        maxGasCostToken: response.maxGasCostToken,
        tokenDecimals: response.tokenDecimals
    }

    const amount =
        Number(result.maxGasCostToken) / 10 ** Number(result.tokenDecimals)

    return { amount }
}
