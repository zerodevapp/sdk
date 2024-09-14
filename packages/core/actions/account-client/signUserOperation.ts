import type { SmartAccount } from "permissionless/accounts"
import { prepareUserOperationRequest } from "permissionless/actions/smartAccount"
import type {
    PrepareUserOperationRequestParameters,
    PrepareUserOperationRequestReturnType
} from "permissionless/actions/smartAccount"
import type {
    EntryPoint,
    GetEntryPointVersion,
    Prettify,
    UserOperation
} from "permissionless/types"
import {
    AccountOrClientNotFoundError,
    parseAccount
} from "permissionless/utils"
import type { Chain, Client, Transport } from "viem"
import { getAction } from "viem/utils"

export type SignUserOperationParameters<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined =
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined
> = PrepareUserOperationRequestParameters<
    entryPoint,
    TTransport,
    TChain,
    TAccount
>

export type SignUserOperationReturnType<entryPoint extends EntryPoint> =
    PrepareUserOperationRequestReturnType<entryPoint>

export async function signUserOperation<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined =
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<
        SignUserOperationParameters<entryPoint, TTransport, TChain, TAccount>
    >
): Promise<SignUserOperationReturnType<entryPoint>> {
    const { account: account_ = client.account } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(account_) as SmartAccount<
        entryPoint,
        string,
        TTransport,
        TChain
    >

    const userOperation = await getAction(
        client,
        prepareUserOperationRequest<entryPoint, TTransport, TChain, TAccount>,
        "prepareUserOperationRequest"
    )({ ...args, account } as PrepareUserOperationRequestParameters<
        entryPoint,
        TTransport,
        TChain,
        TAccount
    >)

    userOperation.signature = await account.signUserOperation(
        userOperation as UserOperation<GetEntryPointVersion<entryPoint>>
    )

    return userOperation as SignUserOperationReturnType<entryPoint>
}
