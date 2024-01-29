import type {
    UserOperation,
    UserOperationWithBigIntAsHex
} from "permissionless/types/userOperation.js"
import { deepHexlify } from "permissionless/utils"
import type { Address, Hex } from "viem"
import type { PartialBy } from "viem/types/utils"
import { KERNEL_ADDRESSES } from "../../accounts/index.js"
import type { ZeroDevPaymasterClient } from "../../clients/paymasterClient.js"

export type SponsorUserOperationParameters = {
    userOperation: PartialBy<
        UserOperation,
        | "callGasLimit"
        | "preVerificationGas"
        | "verificationGasLimit"
        | "paymasterAndData"
    >
    entryPoint?: Address
    gasTokenData?: {
        tokenAddress: Hex
    }
    shouldOverrideFee?: boolean
    shouldConsume?: boolean
}

export type SponsorUserOperationReturnType = UserOperation

/**
 * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
 */
export const sponsorUserOperation = async (
    client: ZeroDevPaymasterClient,
    args: SponsorUserOperationParameters
): Promise<SponsorUserOperationReturnType> => {
    const response = await client.request({
        method: "zd_sponsorUserOperation",
        params: [
            {
                chainId: client.chain?.id as number,
                userOp: deepHexlify(
                    args.userOperation
                ) as UserOperationWithBigIntAsHex,
                entryPointAddress:
                    args.entryPoint ?? KERNEL_ADDRESSES.ENTRYPOINT_V0_6,
                gasTokenData: args.gasTokenData && {
                    tokenAddress: args.gasTokenData.tokenAddress
                },
                shouldOverrideFee: args.shouldOverrideFee ?? false,
                shouldConsume: args.shouldConsume ?? true
            }
        ]
    })
    let result: UserOperation = {
        ...args.userOperation,
        paymasterAndData: response.paymasterAndData,
        preVerificationGas: BigInt(response.preVerificationGas),
        verificationGasLimit: BigInt(response.verificationGasLimit),
        callGasLimit: BigInt(response.callGasLimit)
    }
    if (
        response.maxFeePerGas !== undefined &&
        response.maxPriorityFeePerGas !== undefined
    ) {
        result = {
            ...result,
            maxFeePerGas: BigInt(response.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(response.maxPriorityFeePerGas)
        }
    }

    return result
}
