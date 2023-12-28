import type {
    UserOperation,
    UserOperationWithBigIntAsHex
} from "permissionless/types/userOperation.js"
import { deepHexlify } from "permissionless/utils"
import type { Address, Hex } from "viem"
import type { PartialBy } from "viem/types/utils"
import { KernelPaymasterClient } from "../../clients/kernel.js"

export type SponsorUserOperationParameters = {
    userOperation: PartialBy<
        UserOperation,
        | "callGasLimit"
        | "preVerificationGas"
        | "verificationGasLimit"
        | "paymasterAndData"
    >
    entryPoint: Address
    gasTokenData?: {
        tokenAddress: Hex
        erc20UserOp: PartialBy<
            UserOperation,
            | "callGasLimit"
            | "preVerificationGas"
            | "verificationGasLimit"
            | "paymasterAndData"
        >
        erc20CallData: Hex
    }
    shouldOverrideFee?: boolean
    shouldConsume?: boolean
}

export type SponsorUserOperationReturnType = UserOperation

/**
 * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
 *
 * - Docs: https://docs.pimlico.io/permissionless/reference/stackup-paymaster-actions/sponsorUserOperation
 *
 * @param client {@link PimlicoBundlerClient} that you created using viem's createClient whose transport url is pointing to the Pimlico's bundler.
 * @param args {@link sponsorUserOperationParameters} UserOperation you want to sponsor & entryPoint.
 * @returns paymasterAndData & updated gas parameters, see {@link SponsorUserOperationReturnType}
 *
 *
 * @example
 * import { createClient } from "viem"
 * import { sponsorUserOperation } from "permissionless/actions/stackup"
 *
 * const bundlerClient = createClient({
 *      chain: goerli,
 *      transport: http("https://api.stackup.sh/v2/paymaster/YOUR_API_KEY_HERE")
 * })
 *
 * await sponsorUserOperation(bundlerClient, {
 *      userOperation: userOperationWithDummySignature,
 *      entryPoint: entryPoint
 * }})
 *
 */
export const sponsorUserOperation = async (
    client: KernelPaymasterClient,
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
                entryPointAddress: args.entryPoint,
                gasTokenData: args.gasTokenData && {
                    tokenAddress: args.gasTokenData.tokenAddress,
                    erc20UserOp: deepHexlify(
                        args.gasTokenData.erc20UserOp
                    ) as UserOperationWithBigIntAsHex,
                    erc20CallData: args.gasTokenData.erc20CallData
                },
                shouldOverrideFee: args.shouldOverrideFee ?? false,
                shouldConsume: args.shouldConsume ?? true
            }
        ]
    })
    console.log(response)
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
