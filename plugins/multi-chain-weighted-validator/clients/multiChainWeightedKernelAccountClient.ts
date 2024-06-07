import {
    type KernelSmartAccount,
    createKernelAccountClient
} from "@zerodev/sdk"
import type { SmartAccountClientConfig } from "@zerodev/sdk/clients/kernelAccountClient"
import type { EntryPoint } from "permissionless/types"
import type { BundlerRpcSchema } from "permissionless/types/bundler"
import type { Chain, Client, Transport } from "viem"
import {
    type MultiChainWeightedKernelAccountClientActions,
    multiChainWeightedKernelAccountClientActions
} from "./decorators/multiChainWeightedKernelAccountClient.js"

export type MultiChainWeightedKernelAccountClient<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends KernelSmartAccount<entryPoint> | undefined =
        | KernelSmartAccount<entryPoint>
        | undefined
> = Client<
    transport,
    chain,
    account,
    BundlerRpcSchema<entryPoint>,
    MultiChainWeightedKernelAccountClientActions<entryPoint, chain, account>
>

export const createMultiChainWeightedKernelAccountClient = <
    TSmartAccount extends KernelSmartAccount<TEntryPoint> | undefined,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = TSmartAccount extends KernelSmartAccount<
        infer U
    >
        ? U
        : never
>(
    parameters: SmartAccountClientConfig<
        TEntryPoint,
        TTransport,
        TChain,
        TSmartAccount
    >
): MultiChainWeightedKernelAccountClient<
    TEntryPoint,
    TTransport,
    TChain,
    TSmartAccount
> => {
    const {
        key = "Account",
        name = "Multi Chain Weighted Kernel Account Client",
        middleware
    } = parameters

    const client = createKernelAccountClient({
        ...parameters,
        name,
        key
    })

    return client.extend(
        multiChainWeightedKernelAccountClientActions({
            middleware
        })
    ) as MultiChainWeightedKernelAccountClient<
        TEntryPoint,
        TTransport,
        TChain,
        TSmartAccount
    >
}
