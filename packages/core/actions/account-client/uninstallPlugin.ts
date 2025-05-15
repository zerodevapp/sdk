import type { Chain, Client, Hash, Hex, Transport } from "viem"
import {
    type SendUserOperationParameters,
    type SmartAccount,
    sendUserOperation
} from "viem/account-abstraction"
import {
    concatHex,
    encodeFunctionData,
    getAction,
    pad,
    parseAccount
} from "viem/utils"
import { KernelV3AccountAbi } from "../../accounts/kernel/abi/kernel_v_3_0_0/KernelAccountAbi.js"
import { VALIDATOR_TYPE } from "../../constants.js"
import { AccountNotFoundError } from "../../errors/index.js"
import type {
    KernelValidator,
    KernelValidatorHook
} from "../../types/kernel.js"

export type UninstallPluginParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
> = Partial<SendUserOperationParameters<account, accountOverride, calls>> & {
    plugin: KernelValidator<string>
    hook?: KernelValidatorHook
}

export async function uninstallPlugin<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account>,
    args: UninstallPluginParameters<account, accountOverride, calls>
): Promise<Hash> {
    const {
        account: account_ = client.account,
        plugin,
        hook,
        ...restArgs
    } = args
    if (!account_)
        throw new AccountNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })

    const account = parseAccount(account_) as SmartAccount

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
        sendUserOperation,
        "sendUserOperation"
    )({
        ...restArgs,
        calls: [
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
        account
    } as SendUserOperationParameters)
}
