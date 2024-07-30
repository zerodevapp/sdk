import type { SendTransactionWithPaymasterParameters } from "permissionless/actions/smartAccount"
import type { EntryPoint, Prettify } from "permissionless/types"
import {
    AccountOrClientNotFoundError,
    parseAccount
} from "permissionless/utils"
import type { Chain, Client, Transport } from "viem"
import { readContract } from "viem/actions"
import { getAction } from "viem/utils"
import type { KernelSmartAccount } from "../../accounts/index.js"
import { KernelV3AccountAbi } from "../../accounts/kernel/abi/kernel_v_3_0_0/KernelAccountAbi.js"

export type GetKernelV3ModuleCurrentNonceParameters<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends KernelSmartAccount<entryPoint> | undefined =
        | KernelSmartAccount<entryPoint>
        | undefined,
    TChainOverride extends Chain | undefined = Chain | undefined
> = Prettify<
    SendTransactionWithPaymasterParameters<
        entryPoint,
        TChain,
        TAccount,
        TChainOverride
    >
>

export async function getKernelV3ModuleCurrentNonce<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends KernelSmartAccount<entryPoint> | undefined =
        | KernelSmartAccount<entryPoint>
        | undefined,
    TChainOverride extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<
        GetKernelV3ModuleCurrentNonceParameters<
            entryPoint,
            TChain,
            TAccount,
            TChainOverride
        >
    >
): Promise<number> {
    const { account: account_ = client.account } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(account_) as KernelSmartAccount<entryPoint>

    try {
        const nonce = await getAction(
            client,
            readContract,
            "sendTransaction"
        )({
            abi: KernelV3AccountAbi,
            address: account.address,
            functionName: "currentNonce",
            args: []
        })
        return nonce
    } catch (error) {
        return 1
    }
}
