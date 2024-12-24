import type { Chain, Client, Hash, Prettify, Transport } from "viem"
import {
    type SendUserOperationParameters,
    type SmartAccount,
    sendUserOperation
} from "viem/account-abstraction"
import { getAction, parseAccount } from "viem/utils"
import { getUpgradeKernelCall } from "../../accounts/kernel/utils/common/getUpgradeKernelCall.js"
import { AccountNotFoundError } from "../../errors/index.js"
import type { KERNEL_VERSION_TYPE } from "../../types/kernel.js"

export type UpgradeKernelParameters<
    account extends SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
> = Prettify<
    Partial<SendUserOperationParameters<account, accountOverride, calls>> & {
        kernelVersion: KERNEL_VERSION_TYPE
    }
>

export async function upgradeKernel<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account>,
    args: Prettify<UpgradeKernelParameters<account, accountOverride, calls>>
): Promise<Hash> {
    const { account: account_ = client.account, kernelVersion } = args
    if (!account_)
        throw new AccountNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })

    const account = parseAccount(account_) as SmartAccount
    const call = getUpgradeKernelCall(account, kernelVersion)

    return await getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({
        ...args,
        calls: [call],
        account
    } as SendUserOperationParameters)
}
