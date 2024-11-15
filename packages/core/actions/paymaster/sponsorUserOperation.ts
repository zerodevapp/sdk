import { type Address, type Hex, type Prettify, isAddressEqual } from "viem"
import {
    type EntryPointVersion,
    type GetPaymasterDataParameters,
    type GetPaymasterStubDataReturnType,
    entryPoint06Address
} from "viem/account-abstraction"
import type { ZeroDevPaymasterClient } from "../../clients/paymasterClient.js"
import { deepHexlify } from "../../utils.js"

export type SponsorUserOperationParameters = {
    userOperation: GetPaymasterDataParameters
    gasToken?: Hex
    shouldOverrideFee?: boolean
    shouldConsume?: boolean
}

export type SponsorUserOperationReturnType = Prettify<
    GetPaymasterStubDataReturnType & {
        maxFeePerGas?: bigint | undefined
        maxPriorityFeePerGas?: bigint | undefined
        callGasLimit?: bigint | undefined
        verificationGasLimit?: bigint | undefined
        preVerificationGas?: bigint | undefined
    }
>

/**
 * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
 */
export const sponsorUserOperation = async <
    entryPointVersion extends EntryPointVersion
>(
    client: ZeroDevPaymasterClient<entryPointVersion>,
    args: SponsorUserOperationParameters
): Promise<SponsorUserOperationReturnType> => {
    console.log({ args })
    const {
        userOperation: {
            chainId,
            entryPointAddress,
            context,
            // @ts-ignore
            calls,
            // @ts-ignore
            account,
            ..._userOperation
        }
    } = args
    const response = await client.request({
        method: "zd_sponsorUserOperation",
        params: [
            {
                chainId: client.chain?.id as number,
                userOp: deepHexlify(_userOperation),
                entryPointAddress: entryPointAddress,
                gasTokenData: args.gasToken && {
                    tokenAddress: args.gasToken
                },
                shouldOverrideFee: args.shouldOverrideFee ?? false,
                shouldConsume: args.shouldConsume ?? true
            }
        ]
    })
    if (isAddressEqual(entryPointAddress, entryPoint06Address)) {
        return {
            paymasterAndData: response.paymasterAndData,
            preVerificationGas: BigInt(response.preVerificationGas),
            verificationGasLimit: BigInt(response.verificationGasLimit),
            callGasLimit: BigInt(response.callGasLimit),
            maxFeePerGas: response.maxFeePerGas
                ? BigInt(response.maxFeePerGas)
                : args.userOperation.maxFeePerGas,
            maxPriorityFeePerGas: response.maxPriorityFeePerGas
                ? BigInt(response.maxPriorityFeePerGas)
                : args.userOperation.maxPriorityFeePerGas
        } as SponsorUserOperationReturnType
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
        maxFeePerGas: response.maxFeePerGas
            ? BigInt(response.maxFeePerGas)
            : args.userOperation.maxFeePerGas,
        maxPriorityFeePerGas: response.maxPriorityFeePerGas
            ? BigInt(response.maxPriorityFeePerGas)
            : args.userOperation.maxPriorityFeePerGas
    } as SponsorUserOperationReturnType
}
