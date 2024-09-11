import { type SmartAccountActions, smartAccountActions } from "permissionless"
import type { Middleware } from "permissionless/actions/smartAccount"
import type { EntryPoint, Prettify } from "permissionless/types"
import type { Chain, Client, Hash, Transport } from "viem"
import type { KernelSmartAccount } from "../../accounts/index.js"
import {
    type GetKernelV3ModuleCurrentNonceParameters,
    getKernelV3ModuleCurrentNonce
} from "../../actions/account-client/getKernelV3ModuleCurrentNonce.js"
import {
    type GetUserOperationGasPriceReturnType,
    getUserOperationGasPrice
} from "../../actions/account-client/getUserOperationGasPrice.js"
import {
    type InvalidateNonceParameters,
    invalidateNonce
} from "../../actions/account-client/invalidateNonce.js"
import type {
    PrepareUserOperationParameters,
    PrepareUserOperationReturnType,
    SignUserOperationParameters,
    SignUserOperationReturnType,
    UninstallPluginParameters
} from "../../actions/index.js"
import { signUserOperation, prepareUserOperation, uninstallPlugin } from "../../actions/index.js"

import {
    type EstimateGasInERC20Parameters,
    type EstimateGasInERC20ReturnType,
    estimateGasInERC20
} from "../../actions/paymaster/estimateGasInERC20.js"
import {
    type SponsorUserOperationParameters,
    type SponsorUserOperationReturnType,
    sponsorUserOperation
} from "../../actions/paymaster/sponsorUserOperation.js"
import type { ZeroDevPaymasterClient } from "../paymasterClient.js"

export type ZeroDevPaymasterClientActions<entryPoint extends EntryPoint> = {
    /**
     * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
     */
    sponsorUserOperation: (
        args: SponsorUserOperationParameters<entryPoint>
    ) => Promise<SponsorUserOperationReturnType<entryPoint>>
    estimateGasInERC20: (
        args: EstimateGasInERC20Parameters
    ) => Promise<EstimateGasInERC20ReturnType>
}

export const zerodevPaymasterActions =
    <entryPoint extends EntryPoint>(entryPointAddress: entryPoint) =>
    (client: Client): ZeroDevPaymasterClientActions<entryPoint> => ({
        sponsorUserOperation: async (
            args: Omit<SponsorUserOperationParameters<entryPoint>, "entryPoint">
        ) =>
            sponsorUserOperation<entryPoint>(
                client as ZeroDevPaymasterClient<entryPoint>,
                {
                    ...args,
                    entryPoint: entryPointAddress
                }
            ),
        estimateGasInERC20: async (args: EstimateGasInERC20Parameters) =>
            estimateGasInERC20(
                client as ZeroDevPaymasterClient<entryPoint>,
                args
            )
    })

export type KernelAccountClientActions<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends KernelSmartAccount<entryPoint> | undefined =
        | KernelSmartAccount<entryPoint>
        | undefined
> = SmartAccountActions<entryPoint, TChain, TSmartAccount> & {
    /**
     * Signs a user operation with the given transport, chain, and smart account.
     *
     * @param args - Parameters for the signUserOperation function
     * @returns A promise that resolves to the result of the signUserOperation function
     */
    signUserOperation: <TTransport extends Transport>(
        args: Parameters<
            typeof signUserOperation<
                entryPoint,
                TTransport,
                TChain,
                TSmartAccount
            >
        >[1]
    ) => Promise<SignUserOperationReturnType<entryPoint>>
    /**
     * Prepare a user operation with the given transport, chain, and smart account without the signature.
     *
     * @param args - Parameters for the prepareUserOperation function
     * @returns A promise that resolves to the result of the prepareUserOperation function
     */
    prepareUserOperation: <TTransport extends Transport>(
        args: Parameters<
            typeof prepareUserOperation<
                entryPoint,
                TTransport,
                TChain,
                TSmartAccount
            >
        >[1]
    ) => Promise<PrepareUserOperationReturnType<entryPoint>>
    /**
     * Returns the live gas prices that you can use to send a user operation.
     *
     * @returns maxFeePerGas & maxPriorityFeePerGas {@link GetUserOperationGasPriceReturnType}
     */
    getUserOperationGasPrice: () => Promise<
        Prettify<GetUserOperationGasPriceReturnType>
    >
    /**
     * Creates, signs, and sends an uninstall kernel plugin transaction to the network.
     * This function also allows you to sponsor this transaction if sender is a smartAccount
     *
     *
     * @param args - {@link UninstallPermissionParameters}
     * @returns The [Transaction](https://viem.sh/docs/glossary/terms.html#transaction) hash. {@link SendTransactionReturnType}
     */
    uninstallPlugin: <
        TChainOverride extends Chain | undefined = Chain | undefined
    >(
        args: UninstallPluginParameters<
            entryPoint,
            TChain,
            TSmartAccount,
            TChainOverride
        >
    ) => Promise<Hash>
    /**
     * Creates, signs, and sends a kernel v3 module nonce invalidation transaction to the network.
     * This function also allows you to sponsor this transaction if sender is a smartAccount
     *
     *
     * @param args - {@link InvalidateNonceParameters}
     * @returns The [Transaction](https://viem.sh/docs/glossary/terms.html#transaction) hash. {@link SendTransactionReturnType}
     */
    invalidateNonce: <
        TChainOverride extends Chain | undefined = Chain | undefined
    >(
        args: InvalidateNonceParameters<
            entryPoint,
            TChain,
            TSmartAccount,
            TChainOverride
        >
    ) => Promise<Hash>
    /**
     * Creates, signs, and sends a transaction to fetch KernelV3 module nonce to the network.
     * This function also allows you to sponsor this transaction if sender is a smartAccount
     *
     *
     * @param args - {@link GetKernelV3ModuleCurrentNonceParameters}
     * @returns nonce
     */
    getKernelV3ModuleCurrentNonce: <
        TChainOverride extends Chain | undefined = Chain | undefined
    >(
        args: GetKernelV3ModuleCurrentNonceParameters<
            entryPoint,
            TChain,
            TSmartAccount,
            TChainOverride
        >
    ) => Promise<number>
}

export function kernelAccountClientActions<entryPoint extends EntryPoint>({
    middleware
}: Middleware<entryPoint>) {
    return <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends KernelSmartAccount<entryPoint> | undefined =
            | KernelSmartAccount<entryPoint>
            | undefined
    >(
        client: Client<TTransport, TChain, TSmartAccount>
    ): KernelAccountClientActions<entryPoint, TChain, TSmartAccount> => ({
        ...smartAccountActions({ middleware })(client),
        signUserOperation: (args) =>
            signUserOperation<entryPoint, TTransport, TChain, TSmartAccount>(
                client,
                {
                    ...args,
                    middleware
                } as SignUserOperationParameters<entryPoint, TSmartAccount>
            ),
        prepareUserOperation: (args) =>
            prepareUserOperation<entryPoint, TTransport, TChain, TSmartAccount>(
                client,
                {
                    ...args,
                    middleware
                } as PrepareUserOperationParameters<entryPoint, TSmartAccount>
            ),
        getUserOperationGasPrice: async () => getUserOperationGasPrice(client),
        uninstallPlugin: async (args) =>
            uninstallPlugin<entryPoint, TTransport, TChain, TSmartAccount>(
                client,
                {
                    ...args,
                    middleware
                } as UninstallPluginParameters<
                    entryPoint,
                    TChain,
                    TSmartAccount
                >
            ),
        invalidateNonce: async (args) =>
            invalidateNonce(client, {
                ...args,
                middleware
            } as InvalidateNonceParameters<entryPoint, TChain, TSmartAccount>),
        getKernelV3ModuleCurrentNonce: async (args) =>
            getKernelV3ModuleCurrentNonce(client, {
                ...args,
                middleware
            } as GetKernelV3ModuleCurrentNonceParameters<
                entryPoint,
                TChain,
                TSmartAccount
            >)
    })
}
