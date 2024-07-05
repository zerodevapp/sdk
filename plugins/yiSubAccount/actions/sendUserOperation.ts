import {
    AccountOrClientNotFoundError,
    type UserOperation,
    parseAccount
} from "permissionless"
import { sendUserOperation as sendUserOperationBundler } from "permissionless/actions"
import { prepareUserOperationRequest } from "permissionless/actions/smartAccount"
import type { SendUserOperationParameters } from "permissionless/actions/smartAccount/sendUserOperation"
import type {
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import type { Chain, Client, Hash, Transport } from "viem"
import type { Prettify } from "viem/chains"
import { getAction } from "viem/utils"
import type { YiSubAccount } from "../account/createYiSubAccount"
import type { SmartAccount } from "permissionless/accounts"

export async function sendUserOperation<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<SendUserOperationParameters<entryPoint, TAccount>>
): Promise<Hash> {
    const { account: account_ = client.account } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = (parseAccount(account_) as YiSubAccount<entryPoint>)
        .masterAccount

    const { userOperation: _userOperation } = args

    _userOperation.signature = await account.getDummySignature(
        _userOperation as UserOperation<GetEntryPointVersion<entryPoint>>
    )
    const userOperation = await getAction(
        client,
        prepareUserOperationRequest<entryPoint, TTransport, TChain, TAccount>,
        "prepareUserOperationRequest"
    )(args)

    userOperation.signature = await account.signUserOperation(
        userOperation as UserOperation<GetEntryPointVersion<entryPoint>>
    )

    return sendUserOperationBundler(client, {
        userOperation: userOperation as UserOperation<
            GetEntryPointVersion<entryPoint>
        >,
        entryPoint: account.entryPoint
    })
}
