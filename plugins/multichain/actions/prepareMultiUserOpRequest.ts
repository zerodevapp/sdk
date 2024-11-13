import type { Chain, Client, Transport } from "viem"
import { estimateFeesPerGas, getChainId } from "viem/actions"
import type { Prettify } from "viem/chains"
import { getAction, parseAccount } from "viem/utils"
import { ecdsaGetMultiUserOpDummySignature } from "../ecdsa/ecdsaGetMultiUserOpDummySignature.js"
import { webauthnGetMultiUserOpDummySignature } from "../webauthn/webauthnGetMultiUserOpDummySignature.js"
import { ValidatorType } from "./type.js"
import type {
    PrepareUserOperationParameters,
    PrepareUserOperationRequest,
    PrepareUserOperationReturnType,
    SmartAccount,
    UserOperation,
    UserOperationCall
} from "viem/account-abstraction"
import { AccountNotFoundError } from "@zerodev/sdk"

export async function prepareMultiUserOpRequest<
    account extends SmartAccount | undefined,
    const calls extends readonly unknown[],
    const request extends PrepareUserOperationRequest<
        account,
        accountOverride,
        calls
    >,
    accountOverride extends SmartAccount | undefined = undefined
>(
    client: Client<Transport, Chain | undefined, account>,
    args_: PrepareUserOperationParameters<
        account,
        accountOverride,
        calls,
        request
    >,
    validatorType: ValidatorType,
    numOfUserOps: number
): Promise<
    PrepareUserOperationReturnType<account, accountOverride, calls, request>
> {
    const args = args_ as PrepareUserOperationParameters
    const {
        account: account_ = client.account,
        stateOverride,
        ...partialUserOperation
    } = args

    if (!account_) throw new AccountNotFoundError()

    const account = parseAccount(account_) as SmartAccount

    const [sender, nonce, factory, callData, gasEstimation] = await Promise.all(
        [
            partialUserOperation.sender || account.address,
            partialUserOperation.nonce || account.getNonce(),
            partialUserOperation.factory && partialUserOperation.factoryData
                ? {
                      factory: partialUserOperation.factory,
                      factoryData: partialUserOperation.factoryData
                  }
                : account.getFactoryArgs(),
            partialUserOperation.calls
                ? account.encodeCalls(
                      partialUserOperation.calls as UserOperationCall[]
                  )
                : partialUserOperation.callData,
            !partialUserOperation.maxFeePerGas ||
            !partialUserOperation.maxPriorityFeePerGas
                ? estimateFeesPerGas(account.client)
                : undefined
        ]
    )

    const userOperation: UserOperation<"0.7"> = {
        sender,
        nonce,
        factory: factory.factory,
        factoryData: factory.factoryData,
        callData,
        callGasLimit: partialUserOperation.callGasLimit || BigInt(0),
        verificationGasLimit:
            partialUserOperation.verificationGasLimit || BigInt(0),
        preVerificationGas:
            partialUserOperation.preVerificationGas || BigInt(0),
        maxFeePerGas:
            partialUserOperation.maxFeePerGas ||
            gasEstimation?.maxFeePerGas ||
            BigInt(0),
        maxPriorityFeePerGas:
            partialUserOperation.maxPriorityFeePerGas ||
            gasEstimation?.maxPriorityFeePerGas ||
            BigInt(0),
        signature: partialUserOperation.signature || "0x"
    }

    // if (typeof middleware === "function") {
    //     return middleware({
    //         userOperation,
    //         entryPoint: account.entryPoint
    //     } as {
    //         userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
    //         entryPoint: entryPoint
    //     }) as Promise<PrepareUserOperationRequestReturnType<entryPoint>>
    // }

    if (middleware && typeof middleware !== "function" && middleware.gasPrice) {
        const gasPrice = await middleware.gasPrice()
        userOperation.maxFeePerGas = gasPrice.maxFeePerGas
        userOperation.maxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas
    }

    if (!userOperation.maxFeePerGas || !userOperation.maxPriorityFeePerGas) {
        const estimateGas = await estimateFeesPerGas(account.client)
        userOperation.maxFeePerGas =
            userOperation.maxFeePerGas || estimateGas.maxFeePerGas
        userOperation.maxPriorityFeePerGas =
            userOperation.maxPriorityFeePerGas ||
            estimateGas.maxPriorityFeePerGas
    }

    const chainId = await getChainId(client)

    if (userOperation.signature === "0x") {
        if (validatorType === ValidatorType.ECDSA) {
            userOperation.signature = await ecdsaGetMultiUserOpDummySignature(
                userOperation,
                numOfUserOps,
                account.entryPoint,
                chainId
            )
        }
        if (validatorType === ValidatorType.WEBAUTHN) {
            userOperation.signature =
                await webauthnGetMultiUserOpDummySignature(
                    userOperation,
                    numOfUserOps,
                    account.entryPoint,
                    chainId
                )
        }
    }

    if (
        middleware &&
        typeof middleware !== "function" &&
        middleware.sponsorUserOperation
    ) {
        const sponsorUserOperationData = (await middleware.sponsorUserOperation(
            {
                userOperation,
                entryPoint: account.entryPoint
            } as {
                userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
                entryPoint: entryPoint
            }
        )) as SponsorUserOperationReturnType<ENTRYPOINT_ADDRESS_V07_TYPE>

        userOperation.callGasLimit = sponsorUserOperationData.callGasLimit
        userOperation.verificationGasLimit =
            sponsorUserOperationData.verificationGasLimit
        userOperation.preVerificationGas =
            sponsorUserOperationData.preVerificationGas
        userOperation.paymaster = sponsorUserOperationData.paymaster
        userOperation.paymasterVerificationGasLimit =
            sponsorUserOperationData.paymasterVerificationGasLimit
        userOperation.paymasterPostOpGasLimit =
            sponsorUserOperationData.paymasterPostOpGasLimit
        userOperation.paymasterData = sponsorUserOperationData.paymasterData
        userOperation.maxFeePerGas =
            sponsorUserOperationData.maxFeePerGas || userOperation.maxFeePerGas
        userOperation.maxPriorityFeePerGas =
            sponsorUserOperationData.maxPriorityFeePerGas ||
            userOperation.maxPriorityFeePerGas

        return userOperation as PrepareUserOperationRequestReturnType<entryPoint>
    }

    if (
        !userOperation.callGasLimit ||
        !userOperation.verificationGasLimit ||
        !userOperation.preVerificationGas
    ) {
        const gasParameters = await getAction(
            client,
            estimateUserOperationGas<ENTRYPOINT_ADDRESS_V07_TYPE>,
            "estimateUserOperationGas"
        )(
            {
                userOperation,
                entryPoint: account.entryPoint
            },
            // @ts-ignore getAction takes only two params but when compiled this will work
            stateOverrides
        )

        userOperation.callGasLimit |= gasParameters.callGasLimit
        userOperation.verificationGasLimit =
            userOperation.verificationGasLimit ||
            gasParameters.verificationGasLimit
        userOperation.preVerificationGas =
            userOperation.preVerificationGas || gasParameters.preVerificationGas

        userOperation.paymasterPostOpGasLimit =
            userOperation.paymasterPostOpGasLimit ||
            gasParameters.paymasterPostOpGasLimit
        userOperation.paymasterPostOpGasLimit =
            userOperation.paymasterPostOpGasLimit ||
            gasParameters.paymasterPostOpGasLimit
    }

    return userOperation as PrepareUserOperationRequestReturnType<entryPoint>
}
