import {
    type BundlerClient,
    ENTRYPOINT_ADDRESS_V06,
    type EstimateUserOperationGasParameters,
    type EstimateUserOperationGasReturnType
} from "permissionless"
import {
    type GetPaymasterDataParameters,
    type GetPaymasterDataReturnType,
    type GetPaymasterStubDataParameters,
    type GetPaymasterStubDataReturnType,
    paymasterActionsEip7677
} from "permissionless/experimental"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    ENTRYPOINT_ADDRESS_V07_TYPE,
    EntryPoint,
    PartialPick
} from "permissionless/types"
import type { StateOverrides } from "permissionless/types/bundler"
import type { UserOperation } from "permissionless/types/userOperation.js"
import type { PartialBy } from "viem/types/utils"
import type { ZeroDevPaymasterClient } from "../../clients/paymasterClient.js"

export type SponsorUserOperationEip7677Parameters<
    entryPoint extends EntryPoint
> = {
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
}

export type SponsorUserOperationEip7677ReturnType<
    entryPoint extends EntryPoint
> = entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE
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
export const sponsorUserOperationEip7677 = async <
    entryPoint extends EntryPoint
>(
    client: ZeroDevPaymasterClient<entryPoint>,
    args: SponsorUserOperationEip7677Parameters<entryPoint>,
    bundlerClient: BundlerClient<entryPoint>,
    stateOverrides?: StateOverrides
): Promise<SponsorUserOperationEip7677ReturnType<entryPoint>> => {
    const { entryPoint: entryPointAddress, userOperation } = args
    const chain = client.chain
    const paymasterClient = client.extend(
        paymasterActionsEip7677(entryPointAddress)
    )
    const stubData = await paymasterClient.getPaymasterStubData({
        userOperation: userOperation as GetPaymasterStubDataParameters<
            entryPoint,
            typeof chain
        >["userOperation"],
        chain
    })
    const stubUserOperation = {
        ...userOperation,
        ...stubData
    }

    const gas = (await bundlerClient.estimateUserOperationGas(
        {
            userOperation:
                stubUserOperation as EstimateUserOperationGasParameters<entryPoint>["userOperation"]
        },
        stateOverrides
    )) as EstimateUserOperationGasReturnType<entryPoint>
    const userOperationWithGas = {
        ...stubUserOperation,
        callGasLimit: gas.callGasLimit,
        verificationGasLimit: gas.verificationGasLimit,
        preVerificationGas: gas.preVerificationGas
    } as GetPaymasterDataParameters<entryPoint>["userOperation"]

    const paymasterData = await paymasterClient.getPaymasterData({
        userOperation: userOperationWithGas,
        chain
    })

    if (entryPointAddress === ENTRYPOINT_ADDRESS_V06) {
        const paymasterDataV06 =
            paymasterData as GetPaymasterDataReturnType<ENTRYPOINT_ADDRESS_V06_TYPE>
        return {
            callGasLimit: BigInt(gas.callGasLimit),
            verificationGasLimit: BigInt(gas.verificationGasLimit),
            preVerificationGas: BigInt(gas.preVerificationGas),
            paymasterAndData: paymasterDataV06?.paymasterAndData,
            maxFeePerGas: BigInt(userOperation.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(userOperation.maxPriorityFeePerGas)
        } as SponsorUserOperationEip7677ReturnType<entryPoint>
    }
    const stubDataV07 =
        stubData as GetPaymasterStubDataReturnType<ENTRYPOINT_ADDRESS_V07_TYPE>
    const paymasterDataV07 =
        paymasterData as GetPaymasterDataReturnType<ENTRYPOINT_ADDRESS_V07_TYPE>

    return {
        callGasLimit: BigInt(gas.callGasLimit),
        verificationGasLimit: BigInt(gas.verificationGasLimit),
        preVerificationGas: BigInt(gas.preVerificationGas),
        paymaster: paymasterDataV07.paymaster,
        paymasterData: paymasterDataV07.paymasterData,
        paymasterVerificationGasLimit:
            stubDataV07.paymasterVerificationGasLimit &&
            BigInt(stubDataV07.paymasterVerificationGasLimit),
        paymasterPostOpGasLimit:
            stubDataV07?.paymasterPostOpGasLimit &&
            BigInt(stubDataV07.paymasterPostOpGasLimit),
        maxFeePerGas: BigInt(userOperation.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(userOperation.maxPriorityFeePerGas)
    } as SponsorUserOperationEip7677ReturnType<entryPoint>
}
