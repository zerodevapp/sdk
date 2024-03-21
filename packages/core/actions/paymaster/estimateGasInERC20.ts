import type {
    UserOperation,
    UserOperationWithBigIntAsHex
} from "permissionless/types/userOperation.js"
import { deepHexlify } from "permissionless/utils"
import type { Address, Hex } from "viem"
import { KERNEL_ADDRESSES } from "../../accounts/index.js"
import type { ZeroDevPaymasterClient } from "../../clients/paymasterClient.js"

export type EstimateGasInERC20Parameters = {
    userOperation: UserOperation
    gasTokenAddress: Hex
    entryPoint?: Address
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

export const estimateGasInERC20 = async (
    client: ZeroDevPaymasterClient,
    args: EstimateGasInERC20Parameters
): Promise<EstimateGasInERC20ReturnType> => {
    const response = await client.request({
        method: "stackup_getERC20TokenQuotes",
        params: [
            {
                chainId: client.chain?.id as number,
                userOp: deepHexlify(
                    args.userOperation
                ) as UserOperationWithBigIntAsHex,
                tokenAddress: args.gasTokenAddress,
                entryPointAddress:
                    args.entryPoint ?? KERNEL_ADDRESSES.ENTRYPOINT_V0_6
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
