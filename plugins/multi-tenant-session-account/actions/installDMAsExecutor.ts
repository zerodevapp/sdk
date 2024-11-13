import type {
    Chain,
    Client,
    Hash,
    Prettify,
    SendTransactionParameters,
    Transport
} from "viem"
import { getAction, parseAccount } from "viem/utils"
import { getInstallDMAsExecutorCallData } from "../utils/delegationManager.js"
import type {
    SendUserOperationParameters,
    SmartAccount
} from "viem/account-abstraction"
import { AccountNotFoundError } from "@zerodev/sdk"
import type { SessionAccountImplementation } from "../account/createSessionAccount.js"
import { sendTransaction } from "@zerodev/sdk/actions"

export type SendInstallDMAsExecutorUserOperationParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    chain extends Chain | undefined = Chain | undefined,
    chainOverride extends Chain | undefined = Chain | undefined
> = Prettify<Partial<SendTransactionParameters<chain, account, chainOverride>>>

export async function installDMAsExecutor<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined
>(
    client: Client<Transport, chain, account>,
    args: SendInstallDMAsExecutorUserOperationParameters
): Promise<Hash> {
    const { account: account_ = client.account } = args

    if (!account_) {
        throw new AccountNotFoundError()
    }

    const account = parseAccount(
        account_
    ) as SmartAccount<SessionAccountImplementation>

    return await getAction(
        client,
        sendTransaction,
        "sendTransaction"
    )({
        ...args,
        calls: [
            {
                to: account.address,
                data: getInstallDMAsExecutorCallData(),
                value: 0n
            }
        ]
    } as SendTransactionParameters | SendUserOperationParameters)
}
