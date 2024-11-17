import type { Chain, Client, Hash, Transport } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import {
    type ApproveUserOperationParameters,
    type ApproveUserOperationReturnType,
    approveUserOperation
} from "../../actions/approveUserOperation.js"
import {
    type SendUserOperationWithApprovalsParameters,
    sendUserOperationWithApprovals
} from "../../actions/sendUserOperationWithApprovals.js"

export type MultiChainWeightedKernelAccountClientActions = {
    /**
     * Approve a user operation with the given transport, chain, smart account and signer.
     *
     * @param args - Parameters for the approveUserOperation function
     * @returns A promise that resolves to the result of the approveUserOperation function
     */
    approveUserOperation: (
        args: ApproveUserOperationParameters
    ) => Promise<ApproveUserOperationReturnType>
    /**
     * Sends a user operation with the given transport, chain, smart account and signer.
     *
     * @param args - Parameters for the sendUserOperationWithSignatures function
     * @returns A promise that resolves to the result of the sendUserOperationWithSignatures function
     */
    sendUserOperationWithApprovals: (
        args: SendUserOperationWithApprovalsParameters
    ) => Promise<Hash>
}
export function multiChainWeightedKernelAccountClientActions() {
    return <
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends SmartAccount | undefined =
            | SmartAccount
            | undefined
    >(
        client: Client<Transport, TChain, TSmartAccount>
    ): MultiChainWeightedKernelAccountClientActions => {
        return {
            approveUserOperation: (args) => approveUserOperation(client, args),
            sendUserOperationWithApprovals: (args) =>
                sendUserOperationWithApprovals(client, args)
        }
    }
}
