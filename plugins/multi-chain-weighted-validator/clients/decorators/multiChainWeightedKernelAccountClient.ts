import {
    type KernelAccountClientActions,
    type KernelSmartAccount,
    kernelAccountClientActions
} from "@zerodev/sdk"
import type { Middleware } from "permissionless/actions/smartAccount"
import type { EntryPoint, Prettify } from "permissionless/types"
import type { Chain, Client, Hash, Transport } from "viem"
import {
    type ApproveUserOperationParameters,
    type ApproveUserOperationReturnType,
    approveUserOperation
} from "../../actions/approveUserOperation.js"
import {
    type SendUserOperationWithApprovalsParameters,
    sendUserOperationWithApprovals
} from "../../actions/sendUserOperationWithApprovals.js"

export type MultiChainWeightedKernelAccountClientActions<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined =
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined
> = Omit<
    KernelAccountClientActions<entryPoint, TTransport, TChain, TSmartAccount>,
    | "sendUserOperation"
    | "sendTransaction"
    | "writeContract"
    | "sendTransactions"
> & {
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
    ) => Promise<ApproveUserOperationReturnType>
    /**
     * Sends a user operation with the given transport, chain, smart account and signer.
     *
     * @param args - Parameters for the sendUserOperationWithSignatures function
     * @returns A promise that resolves to the result of the sendUserOperationWithSignatures function
     */
    sendUserOperationWithApprovals: <TTransport extends Transport>(
        args: Prettify<
            Parameters<
                typeof sendUserOperationWithApprovals<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >
            >[1]
        >
    ) => Promise<Hash>
}
export function multiChainWeightedKernelAccountClientActions<
    entryPoint extends EntryPoint
>({ middleware }: Middleware<entryPoint>) {
    return <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends
            | KernelSmartAccount<entryPoint, TTransport, TChain>
            | undefined =
            | KernelSmartAccount<entryPoint, TTransport, TChain>
            | undefined
    >(
        client: Client<TTransport, TChain, TSmartAccount>
    ): MultiChainWeightedKernelAccountClientActions<
        entryPoint,
        TTransport,
        TChain,
        TSmartAccount
    > => {
        const baseActions = kernelAccountClientActions({ middleware })(client)
        const {
            sendUserOperation,
            sendTransaction,
            writeContract,
            sendTransactions,
            ...rest
        } = baseActions
        return {
            ...rest,
            approveUserOperation: (args) =>
                approveUserOperation<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >(client, {
                    ...args,
                    middleware
                } as ApproveUserOperationParameters<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >),
            sendUserOperationWithApprovals: (args) =>
                sendUserOperationWithApprovals<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >(client, {
                    ...args,
                    middleware
                } as SendUserOperationWithApprovalsParameters<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >)
        }
    }
}
