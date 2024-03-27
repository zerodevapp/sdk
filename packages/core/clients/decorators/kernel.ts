import { type SmartAccountActions, smartAccountActions } from "permissionless"
import type { SmartAccount } from "permissionless/accounts/types"
import { type Middleware } from "permissionless/actions/smartAccount"
import type { EntryPoint } from "permissionless/types"
import type { Chain, Client, Transport } from "viem"
import type {
    SignUserOperationParameters,
    SignUserOperationReturnType
} from "../../actions/index.js"
import { signUserOperation } from "../../actions/index.js"
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
            sponsorUserOperation(client as ZeroDevPaymasterClient<entryPoint>, {
                ...args,
                entryPoint: entryPointAddress
            }),
        estimateGasInERC20: async (args: EstimateGasInERC20Parameters) =>
            estimateGasInERC20(
                client as ZeroDevPaymasterClient<entryPoint>,
                args
            )
    })

export type KernelAccountClientActions<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
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
    ) => Promise<SignUserOperationReturnType>
}

export const kernelAccountClientActions =
    <entryPoint extends EntryPoint>({ middleware }: Middleware<entryPoint>) =>
    <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends SmartAccount<entryPoint> | undefined =
            | SmartAccount<entryPoint>
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
            )
    })
