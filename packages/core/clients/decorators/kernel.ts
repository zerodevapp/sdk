import type { SmartAccount } from "permissionless/accounts/types"
import type { SponsorUserOperationMiddleware } from "permissionless/actions/smartAccount"
import type { Chain, Client, Transport } from "viem"
import type {
    SignUserOperationParameters,
    SignUserOperationReturnType
} from "../../actions"
import { signUserOperation } from "../../actions"
import {
    type SponsorUserOperationParameters,
    type SponsorUserOperationReturnType,
    sponsorUserOperation
} from "../../actions/paymaster/sponsorUserOperation"
import type { ZeroDevPaymasterClient } from "../paymasterClient"

export type ZeroDevPaymasterClientActions = {
    /**
     * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
     */
    sponsorUserOperation: (
        args: SponsorUserOperationParameters
    ) => Promise<SponsorUserOperationReturnType>
}

export const zerodevPaymasterActions = (
    client: Client
): ZeroDevPaymasterClientActions => ({
    sponsorUserOperation: async (args: SponsorUserOperationParameters) =>
        sponsorUserOperation(client as ZeroDevPaymasterClient, args)
})

export type KernelAccountClientActions<
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends SmartAccount | undefined = SmartAccount | undefined
> = {
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
        signUserOperation: (args) =>
            signUserOperation(client, {
                ...args,
                sponsorUserOperation
            } as SignUserOperationParameters)
    })
