import {
    AccountOrClientNotFoundError,
    type UserOperation,
    estimateUserOperationGas,
    parseAccount
} from "permissionless"
import type {
    PrepareUserOperationRequestParameters,
    PrepareUserOperationRequestReturnType,
    SponsorUserOperationReturnType
} from "permissionless/actions/smartAccount"
import type { StateOverrides } from "permissionless/types/bundler"
import type {
    ENTRYPOINT_ADDRESS_V07_TYPE,
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import type {
    Abi,
    Address,
    Chain,
    Client,
    Hex,
    LocalAccount,
    Transport
} from "viem"
import { estimateFeesPerGas } from "viem/actions"
import type { Prettify } from "viem/chains"
import { type EncodeDeployDataParameters, getAction } from "viem/utils"
import type { KernelSmartAccount } from "../../accounts"

export type SmartAccount<
    entryPoint extends EntryPoint,
    TSource extends string = string,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    TAbi extends Abi | readonly unknown[] = Abi
> = LocalAccount<TSource> & {
    client: Client<transport, chain>
    entryPoint: entryPoint
    getNonce: () => Promise<bigint>
    getInitCode: () => Promise<Hex>
    getFactory: () => Promise<Address | undefined>
    getFactoryData: () => Promise<Hex | undefined>
    encodeCallData: (
        args:
            | {
                  to: Address
                  value: bigint
                  data: Hex
              }
            | {
                  to: Address
                  value: bigint
                  data: Hex
              }[]
    ) => Promise<Hex>
    getDummySignature(
        userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
    ): Promise<Hex>
    getMultiUserOpDummySignature(
        userOperation: UserOperation<GetEntryPointVersion<entryPoint>>,
        numOfUserOps: number
    ): Promise<Hex>
    encodeDeployCallData: ({
        abi,
        args,
        bytecode
    }: EncodeDeployDataParameters<TAbi>) => Promise<Hex>
    signUserOperation: (
        userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
    ) => Promise<Hex>
}

export async function prepareMultiUserOpRequest<
    entryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends KernelSmartAccount<entryPoint> | undefined =
        | KernelSmartAccount<entryPoint>
        | undefined
>(
    client: Client<TTransport, TChain, TSmartAccount>,
    args: Prettify<
        PrepareUserOperationRequestParameters<entryPoint, TSmartAccount>
    >,
    numOfUserOps: number,
    stateOverrides?: StateOverrides
): Promise<Prettify<PrepareUserOperationRequestReturnType<entryPoint>>> {
    const {
        account: account_ = client.account,
        userOperation: partialUserOperation,
        middleware
    } = args

    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(
        account_
    ) as SmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>

    const [sender, nonce, factory, factoryData, callData, gasEstimation] =
        await Promise.all([
            partialUserOperation.sender || account.address,
            partialUserOperation.nonce || account.getNonce(),
            partialUserOperation.factory || account.getFactory(),
            partialUserOperation.factoryData || account.getFactoryData(),
            partialUserOperation.callData,
            !partialUserOperation.maxFeePerGas ||
            !partialUserOperation.maxPriorityFeePerGas
                ? estimateFeesPerGas(account.client)
                : undefined
        ])

    const userOperation: UserOperation<"v0.7"> = {
        sender,
        nonce,
        factory: factory,
        factoryData: factoryData,
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

    if (typeof middleware === "function") {
        return middleware({
            userOperation,
            entryPoint: account.entryPoint
        } as {
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
            entryPoint: entryPoint
        }) as Promise<PrepareUserOperationRequestReturnType<entryPoint>>
    }

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

    if (userOperation.signature === "0x") {
        userOperation.signature = await account.getMultiUserOpDummySignature(
            userOperation,
            numOfUserOps
        )
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
