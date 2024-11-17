import type { Chain, Client, Hash, Prettify, Transport } from "viem"
import {
    type SendUserOperationParameters,
    type SmartAccount,
    sendUserOperation
} from "viem/account-abstraction"
import { encodeFunctionData, getAction, parseAccount } from "viem/utils"
import { KernelV3AccountAbi } from "../../accounts/kernel/abi/kernel_v_3_0_0/KernelAccountAbi.js"
import { AccountNotFoundError } from "../../errors/index.js"

export type InvalidateNonceParameters<
    account extends SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
> = Prettify<
    Partial<SendUserOperationParameters<account, accountOverride, calls>> & {
        nonceToSet: number
    }
>

export async function invalidateNonce<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account>,
    args: Prettify<InvalidateNonceParameters<account, accountOverride, calls>>
): Promise<Hash> {
    const { account: account_ = client.account, nonceToSet } = args
    if (!account_)
        throw new AccountNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })

    const account = parseAccount(account_) as SmartAccount

    return await getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({
        ...args,
        calls: [
            {
                to: account.address,
                data: encodeFunctionData({
                    abi: KernelV3AccountAbi,
                    functionName: "invalidateNonce",
                    args: [nonceToSet]
                }),
                value: 0n
            }
        ],
        account
    } as SendUserOperationParameters)
}
