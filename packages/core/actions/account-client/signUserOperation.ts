import type { SmartAccount } from "permissionless/accounts/types"
import {
    type Middleware,
    prepareUserOperationRequest
} from "permissionless/actions/smartAccount"
import type {
    EntryPoint,
    GetAccountParameter,
    GetEntryPointVersion,
    PartialBy,
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
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
> = {
    userOperation: PartialBy<
        UserOperation<"v0.6">,
        | "nonce"
        | "sender"
        | "initCode"
        | "signature"
        | "callGasLimit"
        | "maxFeePerGas"
        | "maxPriorityFeePerGas"
        | "preVerificationGas"
        | "verificationGasLimit"
        | "paymasterAndData"
    >
} & GetAccountParameter<entryPoint, TAccount> &
    Middleware<entryPoint>

export type SignUserOperationReturnType = UserOperation<"v0.6">

export async function signUserOperation<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<SignUserOperationParameters<entryPoint, TAccount>>
): Promise<SignUserOperationReturnType> {
    const { account: account_ = client.account } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(account_) as SmartAccount<entryPoint>

    const userOperation = await getAction(
        client,
        prepareUserOperationRequest<entryPoint, TTransport, TChain, TAccount>,
        "prepareUserOperationRequest"
    )(args)

    userOperation.signature = await account.signUserOperation(
        userOperation as UserOperation<GetEntryPointVersion<entryPoint>>
    )

    return userOperation as SignUserOperationReturnType
}
