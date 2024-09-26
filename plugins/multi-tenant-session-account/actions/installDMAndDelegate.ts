import { AccountOrClientNotFoundError, parseAccount } from "permissionless"
import type { SmartAccount } from "permissionless/accounts"
import type { SendTransactionsWithPaymasterParameters } from "permissionless/actions/smartAccount"
import { sendTransactions } from "permissionless/actions/smartAccount"
import type { EntryPoint, Prettify } from "permissionless/types"
import type { Address, Chain, Client, Hash, Transport } from "viem"
import { encodeFunctionData } from "viem"
import { getAction } from "viem/utils"
import { DelegationManagerAbi } from "../abi/DelegationManagerAbi.js"
import { DMVersionToAddressMap, ROOT_AUTHORITY } from "../constants.js"
import type { Delegation } from "../types.js"
import { getInstallDMAsExecutorCallData } from "../utils/delegationManager.js"

export type SendInstallDMAndDelegateUserOperationParameters<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined =
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined
> = Prettify<
    Omit<
        SendTransactionsWithPaymasterParameters<
            entryPoint,
            TTransport,
            TChain,
            TAccount
        >,
        "transactions"
    > & {
        sessionKeyAddress: Delegation["delegate"]
        caveats: Delegation["caveats"]
        delegationManagerAddress?: Address
    }
>

export async function installDMAndDelegate<
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
    args: SendInstallDMAndDelegateUserOperationParameters<
        entryPoint,
        TTransport,
        TChain,
        TAccount
    >
): Promise<Hash> {
    const {
        account: account_ = client.account,
        caveats,
        sessionKeyAddress,
        delegationManagerAddress = DMVersionToAddressMap["1.0.0"]
            .delegationManagerAddress
    } = args

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
        sendTransactions<TTransport, TChain, TAccount, entryPoint>,
        "sendTransactions"
    )({
        ...args,
        transactions: [
            {
                to: account.address,
                data: getInstallDMAsExecutorCallData(),
                value: 0n
            },
            {
                to: delegationManagerAddress,
                data: encodeFunctionData({
                    abi: DelegationManagerAbi,
                    functionName: "delegate",
                    args: [
                        {
                            delegate: sessionKeyAddress,
                            caveats,
                            authority: ROOT_AUTHORITY,
                            delegator: account.address,
                            salt: 0n,
                            signature: "0x"
                        }
                    ]
                }),
                value: 0n
            }
        ]
    } as SendTransactionsWithPaymasterParameters<
        entryPoint,
        TTransport,
        TChain,
        TAccount
    >)
}
