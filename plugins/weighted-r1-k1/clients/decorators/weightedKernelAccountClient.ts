import {
    type KernelAccountClientActions,
    type KernelSmartAccount,
    kernelAccountClientActions
} from "@zerodev/sdk"
import type { Middleware } from "permissionless/actions/smartAccount"
import type { EntryPoint } from "permissionless/types"
import type { Chain, Client, Hex, Transport } from "viem"
import {
    type ApproveUserOperationParameters,
    approveUserOperation
} from "../../actions/approveUserOperation.js"

export type WeightedKernelAccountClientActions<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends KernelSmartAccount<entryPoint> | undefined =
        | KernelSmartAccount<entryPoint>
        | undefined
> = KernelAccountClientActions<entryPoint, TChain, TSmartAccount> & {
    /**
     * Approve a user operation with the given transport, chain, smart account and signer.
     *
     * @param args - Parameters for the signUserOperation function
     * @returns A promise that resolves to the result of the signUserOperation function
     */
    approveUserOperation: <TTransport extends Transport>(
        args: Parameters<
            typeof approveUserOperation<
                entryPoint,
                TTransport,
                TChain,
                TSmartAccount
            >
        >[1]
    ) => Promise<Hex>
}
export function weightedKernelAccountClientActions<
    entryPoint extends EntryPoint
>({ middleware }: Middleware<entryPoint>) {
    return <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends KernelSmartAccount<entryPoint> | undefined =
            | KernelSmartAccount<entryPoint>
            | undefined
    >(
        client: Client<TTransport, TChain, TSmartAccount>
    ): WeightedKernelAccountClientActions<
        entryPoint,
        TChain,
        TSmartAccount
    > => ({
        ...kernelAccountClientActions({ middleware })(client),
        approveUserOperation: (args) =>
            approveUserOperation<entryPoint, TTransport, TChain, TSmartAccount>(
                client,
                {
                    ...args,
                    middleware
                } as ApproveUserOperationParameters<entryPoint, TSmartAccount>
            )
    })
}
