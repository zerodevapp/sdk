import {
    type KernelAccountClientActions,
    type KernelSmartAccount,
    kernelAccountClientActions
} from "@zerodev/sdk"
import type { Middleware } from "permissionless/actions/smartAccount"
import type { EntryPoint, Prettify } from "permissionless/types"
import type { Chain, Client, Hash, Hex, Transport } from "viem"
import {
    type ApproveUserOperationParameters,
    approveUserOperation
} from "../../actions/approveUserOperation.js"
import {
    type SendUserOperationWithSignaturesParameters,
    sendUserOperationWithSignatures
} from "../../actions/sendUserOperationWithSignatures.js"

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
     * @param args - Parameters for the approveUserOperation function
     * @returns A promise that resolves to the result of the approveUserOperation function
     */
    approveUserOperation: <TTransport extends Transport>(
        args: Prettify<
            Parameters<
                typeof approveUserOperation<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >
            >[1]
        >
    ) => Promise<Hex>
    /**
     * Sends a user operation with the given transport, chain, smart account and signer.
     *
     * @param args - Parameters for the sendUserOperationWithSignatures function
     * @returns A promise that resolves to the result of the sendUserOperationWithSignatures function
     */
    sendUserOperationWithSignatures: <TTransport extends Transport>(
        args: Prettify<
            Parameters<
                typeof sendUserOperationWithSignatures<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >
            >[1]
        >
    ) => Promise<Hash>
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
            ),
        sendUserOperationWithSignatures: (args) =>
            sendUserOperationWithSignatures<
                entryPoint,
                TTransport,
                TChain,
                TSmartAccount
            >(client, {
                ...args,
                middleware
            } as SendUserOperationWithSignaturesParameters<
                entryPoint,
                TSmartAccount
            >)
    })
}
