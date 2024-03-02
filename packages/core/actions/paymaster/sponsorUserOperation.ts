import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint
} from "permissionless/types/entrypoint"
import type {
    UserOperation,
    UserOperationWithBigIntAsHex
} from "permissionless/types/userOperation.js"
import { deepHexlify } from "permissionless/utils"
import type { Hex } from "viem"
import type { PartialBy } from "viem/types/utils"
import { KERNEL_ADDRESSES } from "../../accounts/index.js"
import type { ZeroDevPaymasterClient } from "../../clients/paymasterClient.js"

export type SponsorUserOperationParameters<entryPoint extends EntryPoint> = {
    userOperation: entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE
        ? PartialBy<
              UserOperation<"v0.6">,
              "callGasLimit" | "preVerificationGas" | "verificationGasLimit"
          >
        : PartialBy<
              UserOperation<"v0.7">,
              | "callGasLimit"
              | "preVerificationGas"
              | "verificationGasLimit"
              | "paymasterVerificationGasLimit"
              | "paymasterPostOpGasLimit"
          >
    entryPoint: entryPoint
    gasToken?: Hex
    shouldOverrideFee?: boolean
    shouldConsume?: boolean
}

export type SponsorUserOperationReturnType<entryPoint extends EntryPoint> =
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE
        ? Pick<
              UserOperation<"v0.6">,
              | "callGasLimit"
              | "verificationGasLimit"
              | "preVerificationGas"
              | "paymasterAndData"
          >
        : Pick<
              UserOperation<"v0.7">,
              | "callGasLimit"
              | "verificationGasLimit"
              | "preVerificationGas"
              | "paymaster"
              | "paymasterVerificationGasLimit"
              | "paymasterPostOpGasLimit"
              | "paymasterData"
          >

/**
 * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
 */
export const sponsorUserOperation = async <entryPoint extends EntryPoint>(
    client: ZeroDevPaymasterClient<entryPoint>,
    args: SponsorUserOperationParameters<entryPoint>
): Promise<SponsorUserOperationReturnType<entryPoint>> => {
    const response = await client.request({
        method: "zd_sponsorUserOperation",
        params: [
            {
                chainId: client.chain?.id as number,
                userOp: deepHexlify(
                    args.userOperation
                ) as UserOperationWithBigIntAsHex<"v0.6">,
                entryPointAddress:
                    args.entryPoint ?? KERNEL_ADDRESSES.ENTRYPOINT_V0_6,
                gasTokenData: args.gasToken && {
                    tokenAddress: args.gasToken
                },
                shouldOverrideFee: args.shouldOverrideFee ?? false,
                shouldConsume: args.shouldConsume ?? true
            }
        ]
    })
    const responseV06 = response as {
        paymasterAndData: Hex
        preVerificationGas: Hex
        verificationGasLimit: Hex
        callGasLimit: Hex
        paymaster?: never
        paymasterVerificationGasLimit?: never
        paymasterPostOpGasLimit?: never
        paymasterData?: never
    }
    return {
        paymasterAndData: responseV06.paymasterAndData,
        preVerificationGas: BigInt(responseV06.preVerificationGas),
        verificationGasLimit: BigInt(responseV06.verificationGasLimit),
        callGasLimit: BigInt(responseV06.callGasLimit)
    } as SponsorUserOperationReturnType<entryPoint>
    // [TODO] Add gas price params in the response in permissionless
    // let result: UserOperation<"v0.6"> = {
    //     ...args.userOperation,
    //     paymasterAndData: response.paymasterAndData,
    //     preVerificationGas: BigInt(response.preVerificationGas),
    //     verificationGasLimit: BigInt(response.verificationGasLimit),
    //     callGasLimit: BigInt(response.callGasLimit)
    // }
    // if (
    //     response.maxFeePerGas !== undefined &&
    //     response.maxPriorityFeePerGas !== undefined
    // ) {
    //     result = {
    //         ...result,
    //         maxFeePerGas: BigInt(response.maxFeePerGas),
    //         maxPriorityFeePerGas: BigInt(response.maxPriorityFeePerGas)
    //     }
    // }

    // return result
}
