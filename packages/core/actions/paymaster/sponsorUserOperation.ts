import type { Address, Hex } from "viem"
import type { PartialBy } from "viem"
import type { EntryPointVersion, UserOperation } from "viem/account-abstraction"
import type { ZeroDevPaymasterClient } from "../../clients/paymasterClient.js"
import type { EntryPointType, PartialPick } from "../../types/index.js"
import { deepHexlify } from "../../utils.js"

export type SponsorUserOperationParameters<
    entryPointVersion extends EntryPointVersion
> = {
    userOperation: entryPointVersion extends "0.6"
        ? PartialBy<
              UserOperation<"0.6">,
              "callGasLimit" | "preVerificationGas" | "verificationGasLimit"
          >
        : PartialBy<
              UserOperation<"0.7">,
              | "callGasLimit"
              | "preVerificationGas"
              | "verificationGasLimit"
              | "paymasterVerificationGasLimit"
              | "paymasterPostOpGasLimit"
          >
    entryPoint: EntryPointType<entryPointVersion>
    gasToken?: Hex
    shouldOverrideFee?: boolean
    shouldConsume?: boolean
}

export type SponsorUserOperationReturnType<
    entryPointVersion extends EntryPointVersion
> = entryPointVersion extends "0.6"
    ? Pick<
          UserOperation<"0.6">,
          | "callGasLimit"
          | "verificationGasLimit"
          | "preVerificationGas"
          | "paymasterAndData"
      > &
          PartialPick<
              UserOperation<"0.6">,
              "maxFeePerGas" | "maxPriorityFeePerGas"
          >
    : Pick<
          UserOperation<"0.7">,
          | "callGasLimit"
          | "verificationGasLimit"
          | "preVerificationGas"
          | "paymaster"
          | "paymasterVerificationGasLimit"
          | "paymasterPostOpGasLimit"
          | "paymasterData"
      > &
          PartialPick<
              UserOperation<"0.7">,
              "maxFeePerGas" | "maxPriorityFeePerGas"
          >

/**
 * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
 */
export const sponsorUserOperation = async <
    entryPointVersion extends EntryPointVersion
>(
    client: ZeroDevPaymasterClient<entryPointVersion>,
    args: SponsorUserOperationParameters<entryPointVersion>
): Promise<SponsorUserOperationReturnType<entryPointVersion>> => {
    const response = await client.request({
        method: "zd_sponsorUserOperation",
        params: [
            {
                chainId: client.chain?.id as number,
                userOp: deepHexlify(args.userOperation),
                entryPointAddress: args.entryPoint.address,
                gasTokenData: args.gasToken && {
                    tokenAddress: args.gasToken
                },
                shouldOverrideFee: args.shouldOverrideFee ?? false,
                shouldConsume: args.shouldConsume ?? true
            }
        ]
    })
    if (args.entryPoint.version === "0.6") {
        return {
            paymasterAndData: response.paymasterAndData,
            preVerificationGas: BigInt(response.preVerificationGas),
            verificationGasLimit: BigInt(response.verificationGasLimit),
            callGasLimit: BigInt(response.callGasLimit),
            maxFeePerGas:
                response.maxFeePerGas && BigInt(response.maxFeePerGas),
            maxPriorityFeePerGas:
                response.maxPriorityFeePerGas &&
                BigInt(response.maxPriorityFeePerGas)
        } as SponsorUserOperationReturnType<entryPointVersion>
    }
    const responseV07 = response as {
        preVerificationGas: Hex
        verificationGasLimit: Hex
        callGasLimit: Hex
        paymaster: Address
        paymasterVerificationGasLimit: Hex
        paymasterPostOpGasLimit: Hex
        paymasterData: Hex
        maxFeePerGas?: Hex
        maxPriorityFeePerGas?: Hex
        paymasterAndData?: never
    }

    return {
        callGasLimit: BigInt(responseV07.callGasLimit),
        verificationGasLimit: BigInt(responseV07.verificationGasLimit),
        preVerificationGas: BigInt(responseV07.preVerificationGas),
        paymaster: responseV07.paymaster,
        paymasterVerificationGasLimit: BigInt(
            responseV07.paymasterVerificationGasLimit
        ),
        paymasterPostOpGasLimit: BigInt(responseV07.paymasterPostOpGasLimit),
        paymasterData: responseV07.paymasterData,
        maxFeePerGas: response.maxFeePerGas && BigInt(response.maxFeePerGas),
        maxPriorityFeePerGas:
            response.maxPriorityFeePerGas &&
            BigInt(response.maxPriorityFeePerGas)
    } as SponsorUserOperationReturnType<entryPointVersion>
}
