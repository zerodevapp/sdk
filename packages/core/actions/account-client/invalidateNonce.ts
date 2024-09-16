import {
    type SendTransactionWithPaymasterParameters,
    sendTransaction
} from "permissionless/actions/smartAccount"
import type { EntryPoint, Prettify } from "permissionless/types"
import {
    AccountOrClientNotFoundError,
    parseAccount
} from "permissionless/utils"
import type { Chain, Client, Hash, Transport } from "viem"
import { encodeFunctionData, getAction } from "viem/utils"
import type { KernelSmartAccount } from "../../accounts/index.js"
import { KernelV3AccountAbi } from "../../accounts/kernel/abi/kernel_v_3_0_0/KernelAccountAbi.js"

export type InvalidateNonceParameters<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined =
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined,
    TChainOverride extends Chain | undefined = Chain | undefined
> = Prettify<
    SendTransactionWithPaymasterParameters<
        entryPoint,
        TTransport,
        TChain,
        TAccount,
        TChainOverride
    > & {
        nonceToSet: number
    }
>

export async function invalidateNonce<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined =
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined,
    TChainOverride extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<
        InvalidateNonceParameters<
            entryPoint,
            TTransport,
            TChain,
            TAccount,
            TChainOverride
        >
    >
): Promise<Hash> {
    const { account: account_ = client.account, middleware, nonceToSet } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(account_) as KernelSmartAccount<entryPoint>

    return await getAction(
        client,
        sendTransaction<
            TTransport,
            TChain,
            TAccount,
            entryPoint,
            TChainOverride
        >,
        "sendTransaction"
    )({
        ...args,
        to: account.address,
        data: encodeFunctionData({
            abi: KernelV3AccountAbi,
            functionName: "invalidateNonce",
            args: [nonceToSet]
        }),
        value: 0n,
        account,
        middleware
    })
}
