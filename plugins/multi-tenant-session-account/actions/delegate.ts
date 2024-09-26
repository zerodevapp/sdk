import { AccountOrClientNotFoundError, parseAccount } from "permissionless"
import type { SmartAccount } from "permissionless/accounts"
import type { SendTransactionWithPaymasterParameters } from "permissionless/actions/smartAccount"
import { sendTransaction } from "permissionless/actions/smartAccount"
import type { EntryPoint, Prettify } from "permissionless/types"
import type { Address, Chain, Client, Hash, Transport } from "viem"
import { encodeFunctionData } from "viem"
import { getAction } from "viem/utils"
import { DelegationManagerAbi } from "../abi/DelegationManagerAbi.js"
import { DMVersionToAddressMap, ROOT_AUTHORITY } from "../constants.js"
import type { Delegation } from "../types.js"

export type SendDelegateUserOperationParameters<
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
    > & {
        delegation?: Delegation
        sessionKeyAddress: Delegation["delegate"]
        caveats: Delegation["caveats"]
        delegationManagerAddress?: Address
    }
>

export async function delegate<
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
    args: SendDelegateUserOperationParameters<
        entryPoint,
        TTransport,
        TChain,
        TAccount
    >
): Promise<Hash> {
    const {
        account: account_ = client.account,
        delegation,
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
        sendTransaction<TTransport, TChain, TAccount, entryPoint>,
        "sendTransaction"
    )({
        ...args,
        to: delegationManagerAddress,
        data: encodeFunctionData({
            abi: DelegationManagerAbi,
            functionName: "delegate",
            args: [
                delegation ?? {
                    delegate: sessionKeyAddress,
                    caveats,
                    authority: ROOT_AUTHORITY,
                    delegator: account.address,
                    salt: 0n,
                    signature: "0x"
                }
            ]
        })
    })
}
