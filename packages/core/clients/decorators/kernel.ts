import { type SmartAccountActions, smartAccountActions } from "permissionless"
import type { SmartAccount } from "permissionless/accounts/types"
import type { SponsorUserOperationMiddleware } from "permissionless/actions/smartAccount"
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

export type ZeroDevPaymasterClientActions = {
    /**
     * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
     */
    sponsorUserOperation: (
        args: SponsorUserOperationParameters
    ) => Promise<SponsorUserOperationReturnType>
    estimateGasInERC20: (
        args: EstimateGasInERC20Parameters
    ) => Promise<EstimateGasInERC20ReturnType>
}

export const zerodevPaymasterActions = (
    client: Client
): ZeroDevPaymasterClientActions => ({
    sponsorUserOperation: async (args: SponsorUserOperationParameters) =>
        sponsorUserOperation(client as ZeroDevPaymasterClient, args),
    estimateGasInERC20: async (args: EstimateGasInERC20Parameters) =>
        estimateGasInERC20(client as ZeroDevPaymasterClient, args)
})

// export type KernelAccountClientActions<
//     TChain extends Chain | undefined = Chain | undefined,
//     TSmartAccount extends SmartAccount | undefined = SmartAccount | undefined
// > = {
//     signUserOperation: <TTransport extends Transport>(
//         args: Parameters<
//             typeof signUserOperation<TTransport, TChain, TSmartAccount>
//         >[1]
//     ) => Promise<SignUserOperationReturnType>
// }

export type KernelAccountClientActions<
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends SmartAccount | undefined = SmartAccount | undefined
> = SmartAccountActions<TChain, TSmartAccount> & {
    /**
     * Signs a user operation with the given transport, chain, and smart account.
     *
     * @param args - Parameters for the signUserOperation function
     * @returns A promise that resolves to the result of the signUserOperation function
     */
    signUserOperation: <TTransport extends Transport>(
        args: Parameters<
            typeof signUserOperation<TTransport, TChain, TSmartAccount>
        >[1]
    ) => Promise<SignUserOperationReturnType>
}

export const kernelAccountClientActions =
    ({ sponsorUserOperation }: SponsorUserOperationMiddleware) =>
    <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends SmartAccount | undefined =
            | SmartAccount
            | undefined
    >(
        client: Client<TTransport, TChain, TSmartAccount>
    ): KernelAccountClientActions<TChain, TSmartAccount> => ({
        ...smartAccountActions({ sponsorUserOperation })(client),
        signUserOperation: (args) =>
            signUserOperation(client, {
                ...args,
                sponsorUserOperation
            } as SignUserOperationParameters<TSmartAccount>)
    })
