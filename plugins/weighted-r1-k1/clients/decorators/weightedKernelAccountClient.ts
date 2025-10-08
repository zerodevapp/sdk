import type { Chain, Client, Hash, Hex, Transport } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import {
    type ApprovePluginParameters,
    approvePlugin
} from "../../actions/approvePlugin.js"
import {
    type ApproveUserOperationParameters,
    approveUserOperation
} from "../../actions/approveUserOperation.js"
import {
    type GetCurrentSignersReturnType,
    getCurrentSigners
} from "../../actions/getCurrentSigners.js"
import {
    type SendUserOperationWithSignaturesParameters,
    sendUserOperationWithSignatures
} from "../../actions/sendUserOperationWithSignatures.js"
import {
    type UpdateSignersDataParameters,
    updateSignersData
} from "../../actions/updateSignersData.js"
import type { WeightedValidatorContractVersion } from "../../toWeightedValidatorPlugin.js"

export type WeightedKernelAccountClientActions<
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends SmartAccount | undefined = SmartAccount | undefined
> = {
    /**
     * Approve a user operation with the given transport, chain, smart account and signer.
     *
     * @param args - Parameters for the approveUserOperation function
     * @returns A promise that resolves to the result of the approveUserOperation function
     */
    approveUserOperation: <
        accountOverride extends SmartAccount | undefined =
            | SmartAccount
            | undefined
    >(
        args: Parameters<
            typeof approveUserOperation<TSmartAccount, TChain, accountOverride>
        >[1]
    ) => Promise<Hex>
    /**
     * Sends a user operation with the given transport, chain, smart account and signer.
     *
     * @param args - Parameters for the sendUserOperationWithSignatures function
     * @returns A promise that resolves to the result of the sendUserOperationWithSignatures function
     */
    sendUserOperationWithSignatures: (
        args: SendUserOperationWithSignaturesParameters
    ) => Promise<Hash>
    /**
     * Retrieves the current signers for the smart account.
     *
     * @returns A promise that resolves to an array of objects, each containing an encoded public key and its associated weight.
     */
    getCurrentSigner: (args: {
        validatorContractVersion: WeightedValidatorContractVersion
    }) => Promise<GetCurrentSignersReturnType>

    updateSignersData: (args: UpdateSignersDataParameters) => Promise<Hash>

    /**
     * Approve a plugin with the given transport, chain, smart account and signer.
     *
     * @param args - Parameters for the approvePlugin function
     * @returns A promise that resolves to the plugin approval signature by the signer
     */
    approvePlugin: <
        accountOverride extends SmartAccount | undefined =
            | SmartAccount
            | undefined
    >(
        args: ApprovePluginParameters<TSmartAccount, accountOverride>
    ) => Promise<Hex | undefined>
}
export function weightedKernelAccountClientActions() {
    return <
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends SmartAccount | undefined =
            | SmartAccount
            | undefined,
        accountOverride extends SmartAccount | undefined =
            | SmartAccount
            | undefined
    >(
        client: Client<Transport, TChain, TSmartAccount>
    ): WeightedKernelAccountClientActions<TChain, TSmartAccount> => ({
        approveUserOperation: (args) =>
            approveUserOperation(
                client,
                args as ApproveUserOperationParameters<
                    TSmartAccount,
                    accountOverride
                >
            ),
        sendUserOperationWithSignatures: (args) =>
            sendUserOperationWithSignatures(client, args),
        getCurrentSigner: (args) => getCurrentSigners(client, args),
        updateSignersData: (args) => updateSignersData(client, args),
        approvePlugin: (args) => approvePlugin(client, args)
    })
}
