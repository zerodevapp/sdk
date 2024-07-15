import { getEntryPointVersion } from "permissionless"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint
} from "permissionless/types/entrypoint"
import type { UserOperation } from "permissionless/types/userOperation.js"
import { deepHexlify } from "permissionless/utils"
import type { Address, Hex } from "viem"
import type { PartialBy } from "viem/types/utils"
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

export type PartialPick<T, K extends keyof T> = Partial<Pick<T, K>>

export type SponsorUserOperationReturnType<entryPoint extends EntryPoint> =
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE
        ? Pick<
              UserOperation<"v0.6">,
              | "callGasLimit"
              | "verificationGasLimit"
              | "preVerificationGas"
              | "paymasterAndData"
          > &
              PartialPick<
                  UserOperation<"v0.6">,
                  "maxFeePerGas" | "maxPriorityFeePerGas"
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
          > &
              PartialPick<
                  UserOperation<"v0.7">,
                  "maxFeePerGas" | "maxPriorityFeePerGas"
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
                userOp: deepHexlify(args.userOperation),
                entryPointAddress: args.entryPoint,
                gasTokenData: args.gasToken && {
                    tokenAddress: args.gasToken
                },
                shouldOverrideFee: args.shouldOverrideFee ?? false,
                shouldConsume: args.shouldConsume ?? true
            }
        ]
    })
    const entryPointVersion = getEntryPointVersion(args.entryPoint)
    if (entryPointVersion === "v0.6") {
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
        } as SponsorUserOperationReturnType<entryPoint>
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
    } as SponsorUserOperationReturnType<entryPoint>
}
