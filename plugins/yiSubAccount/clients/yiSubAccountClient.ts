import {
    type KernelSmartAccount,
    createKernelAccountClient
} from "@zerodev/sdk"
import type { SmartAccountClientConfig } from "@zerodev/sdk/clients/kernelAccountClient"
import type { EntryPoint } from "permissionless/types"
import type { BundlerRpcSchema } from "permissionless/types/bundler"
import type { Chain, Client, Transport } from "viem"
import {
    type YiSubAccountClientActions,
    yiSubAccountClientActions
} from "./decorators/yiSubAccountClient.js"
import type { SmartAccount } from "permissionless/accounts/types.js"

export type YiSubAccountClient<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
> = Client<
    transport,
    chain,
    account,
    BundlerRpcSchema<entryPoint>,
    YiSubAccountClientActions<entryPoint, chain, account>
>

export const createYiSubAccountClient = <
    TSmartAccount extends SmartAccount<TEntryPoint> | undefined,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = TSmartAccount extends SmartAccount<infer U>
        ? U
        : never
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

    const client = createKernelAccountClient<KernelSmartAccount<TEntryPoint>>({
        ...parameters,
        account: parameters.account as KernelSmartAccount<TEntryPoint>,
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
