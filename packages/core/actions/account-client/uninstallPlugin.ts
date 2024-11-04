import {
    type SendTransactionsWithPaymasterParameters,
    sendTransactions
} from "permissionless/actions/smartAccount"
import type { EntryPoint, Prettify } from "permissionless/types"
import {
    AccountOrClientNotFoundError,
    parseAccount
} from "permissionless/utils"
import type { Chain, Client, Hash, Hex, Transport } from "viem"
import { concatHex, encodeFunctionData, getAction, pad } from "viem/utils"
import type { KernelSmartAccount } from "../../accounts/index.js"
import { KernelV3AccountAbi } from "../../accounts/kernel/abi/kernel_v_3_0_0/KernelAccountAbi.js"
import { VALIDATOR_TYPE } from "../../constants.js"
import type {
    KernelValidator,
    KernelValidatorHook
} from "../../types/kernel.js"

export type UninstallPluginParameters<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined =
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined
> = Prettify<
    Partial<
        SendTransactionsWithPaymasterParameters<
            entryPoint,
            TTransport,
            TChain,
            TAccount
        >
    > & {
        plugin: KernelValidator<entryPoint, string>
        hook?: KernelValidatorHook
    }
>

export async function uninstallPlugin<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined =
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<
        UninstallPluginParameters<entryPoint, TTransport, TChain, TAccount>
    >
): Promise<Hash> {
    const {
        account: account_ = client.account,
        middleware,
        plugin,
        hook
    } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(account_) as KernelSmartAccount<entryPoint>

    let validatorId: Hex
    if (
        [VALIDATOR_TYPE.PERMISSION, VALIDATOR_TYPE.SECONDARY].includes(
            VALIDATOR_TYPE[plugin.validatorType]
        )
    ) {
        validatorId = concatHex([
            VALIDATOR_TYPE[plugin.validatorType],
            pad(plugin.getIdentifier(), {
                size: 20,
                dir: "right"
            })
        ])
    } else {
        throw new Error(`Cannot uninstall ${plugin.validatorType} plugin`)
    }

    const validatorData = await plugin.getEnableData(account.address)

    const hookData = (await hook?.getEnableData(account.address)) ?? "0x"
    return await getAction(
        client,
        sendTransactions<TTransport, TChain, TAccount, entryPoint>,
        "sendTransactions"
    )({
        ...args,
        transactions: [
            {
                to: account.address,
                data: encodeFunctionData({
                    abi: KernelV3AccountAbi,
                    functionName: "uninstallValidation",
                    args: [validatorId, validatorData, hookData]
                }),
                value: 0n
            }
        ],
        account,
        middleware
    })
}
