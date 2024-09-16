import {
    type KernelSmartAccount,
    createKernelAccountClient
} from "@zerodev/sdk"
import type { SmartAccountClientConfig } from "@zerodev/sdk/clients"
import type { SmartAccount } from "permissionless/accounts"
import type { EntryPoint } from "permissionless/types"
import type { BundlerRpcSchema } from "permissionless/types/bundler"
import type { Chain, Client, Transport } from "viem"
import {
    type YiSubAccountClientActions,
    yiSubAccountClientActions
} from "./decorators/yiSubAccountClient.js"

export type YiSubAccountClient<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends
        | SmartAccount<entryPoint, string, transport, chain>
        | undefined =
        | SmartAccount<entryPoint, string, transport, chain>
        | undefined
> = Client<
    transport,
    chain,
    account,
    BundlerRpcSchema<entryPoint>,
    YiSubAccountClientActions<entryPoint, transport, chain, account>
>

export const createYiSubAccountClient = <
    TEntryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends
        | SmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined =
        | SmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined
>(
    parameters: SmartAccountClientConfig<
        TEntryPoint,
        TTransport,
        TChain,
        TSmartAccount
    >
): YiSubAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount> => {
    const {
        key = "Account",
        name = "Yi Sub Account Client",
        middleware
    } = parameters

    const client = createKernelAccountClient({
        ...parameters,
        account: parameters.account as unknown as KernelSmartAccount<
            TEntryPoint,
            TTransport,
            TChain
        >,
        name,
        key
    })

    return client.extend(
        yiSubAccountClientActions({
            middleware
        })
    ) as unknown as YiSubAccountClient<
        TEntryPoint,
        TTransport,
        TChain,
        TSmartAccount
    >
}
