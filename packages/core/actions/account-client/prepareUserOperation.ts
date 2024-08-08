import type { SmartAccount } from "permissionless/accounts/types"
import { prepareUserOperationRequest } from "permissionless/actions/smartAccount"
import type {
    PrepareUserOperationRequestParameters,
    PrepareUserOperationRequestReturnType
} from "permissionless/actions/smartAccount/prepareUserOperationRequest"
import type {
    EntryPoint,
    Prettify,
} from "permissionless/types"
import {
    AccountOrClientNotFoundError,
} from "permissionless/utils"
import type { Chain, Client, Transport } from "viem"
import { getAction } from "viem/utils"

export type PrepareUserOperationParameters<
    entryPoint extends EntryPoint,
    TAccount extends SmartAccount<entryPoint> | undefined =
            | SmartAccount<entryPoint>
        | undefined
> = PrepareUserOperationRequestParameters<entryPoint, TAccount>

export type PrepareUserOperationReturnType<entryPoint extends EntryPoint> =
    PrepareUserOperationRequestReturnType<entryPoint>

export async function prepareUserOperation<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
            | SmartAccount<entryPoint>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<PrepareUserOperationParameters<entryPoint, TAccount>>
): Promise<PrepareUserOperationReturnType<entryPoint>> {
    const { account: account_ = client.account } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const userOperation = await getAction(
        client,
        prepareUserOperationRequest<entryPoint, TTransport, TChain, TAccount>,
        "prepareUserOperationRequest"
    )(args)

    return userOperation as PrepareUserOperationReturnType<entryPoint>
}
