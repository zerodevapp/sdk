import type { Chain, Client, Transport } from "viem"
import {
    type PrepareUserOperationParameters,
    type PrepareUserOperationReturnType,
    type SmartAccount,
    type UserOperation,
    prepareUserOperation
} from "viem/account-abstraction"
import { getAction, parseAccount } from "viem/utils"
import { AccountNotFoundError } from "../../errors/index.js"

export type SignUserOperationParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = SmartAccount | undefined,
    calls extends readonly unknown[] = readonly unknown[]
> = PrepareUserOperationParameters<account, accountOverride, calls>

export type SignUserOperationReturnType = PrepareUserOperationReturnType

export async function signUserOperation<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    chain extends Chain | undefined = Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account>,
    args: SignUserOperationParameters<account, accountOverride, calls>
): Promise<SignUserOperationReturnType> {
    const { account: account_ = client.account } = args
    if (!account_)
        throw new AccountNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })

    const account = parseAccount(account_) as SmartAccount

    const userOperation = await getAction(
        client,
        prepareUserOperation,
        "prepareUserOperation"
    )({ ...args, account } as PrepareUserOperationParameters)

    userOperation.signature = await account.signUserOperation(
        userOperation as UserOperation
    )

    return userOperation
}
