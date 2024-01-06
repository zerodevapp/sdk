import type { SmartAccount } from "permissionless/accounts/types"
import type { SponsorUserOperationMiddleware } from "permissionless/actions/smartAccount"
import { prepareUserOperationRequest } from "permissionless/actions/smartAccount"
import type {
    GetAccountParameter,
    PartialBy,
    UserOperation
} from "permissionless/types"
import {
    AccountOrClientNotFoundError,
    getAction,
    parseAccount
} from "permissionless/utils"
import type { Chain, Client, Transport } from "viem"

export type SignUserOperationParameters<
    TAccount extends SmartAccount | undefined = SmartAccount | undefined
> = {
    userOperation: PartialBy<
        UserOperation,
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
} & GetAccountParameter<TAccount> &
    SponsorUserOperationMiddleware

export type SignUserOperationReturnType = UserOperation

export async function signUserOperation<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: SignUserOperationParameters<TAccount>
): Promise<SignUserOperationReturnType> {
    const { account: account_ = client.account } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(account_) as SmartAccount

    const userOperation = await getAction(
        client,
        prepareUserOperationRequest
    )(args)

    userOperation.signature = await account.signUserOperation(userOperation)

    return userOperation
}
