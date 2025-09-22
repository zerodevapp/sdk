import {
    AccountNotFoundError,
    type KernelSmartAccountImplementation,
    KernelV3AccountAbi,
    isPluginInitialized
} from "@zerodev/sdk"
import type { Call, Chain, Client, Hex, Transport } from "viem"
import type {
    PrepareUserOperationParameters,
    SmartAccount
} from "viem/account-abstraction"
import {
    encodeAbiParameters,
    getAbiItem,
    keccak256,
    parseAbiParameters,
    parseAccount,
    toFunctionSelector
} from "viem/utils"
import {
    type WeightedValidatorContractVersion,
    getValidatorAddress
} from "../toWeightedValidatorPlugin.js"

export type ApproveUserOperationParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = SmartAccount | undefined,
    calls extends readonly unknown[] = readonly unknown[]
> = PrepareUserOperationParameters<account, accountOverride, calls> & {
    validatorContractVersion: WeightedValidatorContractVersion
}

export async function approveUserOperation<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    chain extends Chain | undefined = Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account>,
    args_: ApproveUserOperationParameters<account, accountOverride, calls>
): Promise<Hex> {
    const args = args_ as ApproveUserOperationParameters
    const { account: account_ = client.account, ...userOperation } = args
    if (!account_) throw new AccountNotFoundError()

    const account = parseAccount(
        account_
    ) as SmartAccount<KernelSmartAccountImplementation>
    const validatorAddress = getValidatorAddress(
        account.entryPoint.version,
        args.validatorContractVersion
    )
    if (!validatorAddress) {
        throw new Error("Validator address not found")
    }

    const actionSelector = toFunctionSelector(
        getAbiItem({ abi: KernelV3AccountAbi, name: "execute" })
    )

    // check if regular validator exists
    if (account.kernelPluginManager.regularValidator) {
        const isPluginEnabled =
            (await account.kernelPluginManager.isEnabled(
                account.address,
                actionSelector
            )) ||
            (await isPluginInitialized(
                client,
                account.address,
                account.kernelPluginManager.address
            ))

        // if the regular validator is not enabled, generate enable signature
        if (!isPluginEnabled) {
            const pluginEnableTypedData =
                await account.kernelPluginManager.getPluginsEnableTypedData(
                    account.address
                )

            if (!account.kernelPluginManager.sudoValidator) {
                throw new Error("Sudo validator not found")
            }

            const enableSignature =
                await account.kernelPluginManager.sudoValidator?.signTypedData(
                    pluginEnableTypedData
                )

            return enableSignature
        }
    }

    const callDataAndNonceHash = keccak256(
        encodeAbiParameters(parseAbiParameters("address, bytes, uint256"), [
            userOperation.sender || account.address,
            userOperation.calls
                ? await account.encodeCalls(userOperation.calls as Call[])
                : userOperation.callData,
            userOperation.nonce || (await account.getNonce())
        ])
    )

    const signature = await account.kernelPluginManager.signTypedData({
        domain: {
            name: "WeightedValidator",
            version: "0.0.1",
            chainId: client.chain?.id,
            verifyingContract: validatorAddress
        },
        types: {
            Approve: [{ name: "callDataAndNonceHash", type: "bytes32" }]
        },
        primaryType: "Approve",
        message: {
            callDataAndNonceHash
        }
    })

    return signature
}
