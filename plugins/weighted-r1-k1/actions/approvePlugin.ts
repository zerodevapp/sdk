import {
    AccountNotFoundError,
    type KernelSmartAccountImplementation,
    KernelV3AccountAbi,
    type KernelValidator,
    getActionSelector,
    getKernelV3Nonce,
    getPluginsEnableTypedData,
    isPluginInitialized
} from "@zerodev/sdk"
import {
    type Chain,
    type Client,
    type Hex,
    type Transport,
    zeroAddress
} from "viem"
import type {
    GetSmartAccountParameter,
    SmartAccount
} from "viem/account-abstraction"
import { getChainId } from "viem/actions"
import { getAbiItem, parseAccount, toFunctionSelector } from "viem/utils"
import {
    type WeightedValidatorContractVersion,
    getValidatorAddress
} from "../toWeightedValidatorPlugin.js"

export type ApprovePluginParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = SmartAccount | undefined
> = GetSmartAccountParameter<account, accountOverride> & {
    plugin: KernelValidator
    validatorContractVersion: WeightedValidatorContractVersion
}

export async function approvePlugin<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    chain extends Chain | undefined = Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined
>(
    client: Client<Transport, chain, account>,
    args_: ApprovePluginParameters<account, accountOverride>
): Promise<Hex | undefined> {
    const args = args_ as ApprovePluginParameters
    const { account: account_ = client.account, plugin } = args
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

    const isPluginEnabled =
        (await plugin.isEnabled(account.address, actionSelector)) ||
        (await isPluginInitialized(client, account.address, plugin.address))
    if (isPluginEnabled) {
        return undefined
    }

    const validatorNonce = await getKernelV3Nonce(client, account.address)
    const pluginEnableTypedData = await getPluginsEnableTypedData({
        accountAddress: account.address,
        chainId: client.chain?.id ?? (await getChainId(client)),
        kernelVersion: account.kernelVersion,
        action: {
            selector: getActionSelector(account.entryPoint.version),
            address: zeroAddress
        },
        validator: plugin,
        validatorNonce
    })

    if (!account.kernelPluginManager.sudoValidator) {
        throw new Error("Sudo validator not found")
    }

    const enableSignature =
        await account.kernelPluginManager.sudoValidator.signTypedData(
            pluginEnableTypedData
        )

    return enableSignature
}
