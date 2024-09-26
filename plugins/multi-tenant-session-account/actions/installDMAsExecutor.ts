import { AccountOrClientNotFoundError, parseAccount } from "permissionless"
import type { SmartAccount } from "permissionless/accounts"
import type { SendTransactionWithPaymasterParameters } from "permissionless/actions/smartAccount"
import { sendTransaction } from "permissionless/actions/smartAccount"
import type { EntryPoint, Prettify } from "permissionless/types"
import type { Chain, Client, Hash, Transport } from "viem"
import { getAction } from "viem/utils"
import { getInstallDMAsExecutorCallData } from "../utils/delegationManager.js"

export type SendInstallDMAsExecutorUserOperationParameters<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined =
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined
> = Prettify<
    SendTransactionWithPaymasterParameters<
        entryPoint,
        TTransport,
        TChain,
        TAccount
    >
>

export async function installDMAsExecutor<
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
    args: SendInstallDMAsExecutorUserOperationParameters<
        entryPoint,
        TTransport,
        TChain,
        TAccount
    >
): Promise<Hash> {
    const { account: account_ = client.account } = args

    if (!account_) {
        throw new AccountOrClientNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })
    }

    const account = parseAccount(account_) as SmartAccount<
        entryPoint,
        string,
        TTransport,
        TChain
    >

    if (account.type !== "local") {
        throw new Error("RPC account type not supported")
    }

    return await getAction(
        client,
        sendTransaction<TTransport, TChain, TAccount, entryPoint>,
        "sendTransaction"
    )({
        ...args,
        to: account.address,
        data: getInstallDMAsExecutorCallData()
    })
}
