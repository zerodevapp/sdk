import {
    type KernelSmartAccount,
    createKernelAccountClient
} from "@zerodev/sdk"
import type { SmartAccountClientConfig } from "@zerodev/sdk/clients"
import type { EntryPoint } from "permissionless/types"
import type { BundlerRpcSchema } from "permissionless/types/bundler"
import type { Chain, Client, Transport } from "viem"
import {
    type WeightedKernelAccountClientActions,
    weightedKernelAccountClientActions
} from "./decorators/weightedKernelAccountClient.js"

export type WeightedKernelAccountClient<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends
        | KernelSmartAccount<entryPoint, transport, chain>
        | undefined =
        | KernelSmartAccount<entryPoint, transport, chain>
        | undefined
> = Client<
    transport,
    chain,
    account,
    BundlerRpcSchema<entryPoint>,
    WeightedKernelAccountClientActions<entryPoint, transport, chain, account>
>

export const createWeightedKernelAccountClient = <
    TSmartAccount extends
        | KernelSmartAccount<TEntryPoint, TTransport, TChain>
        | undefined,
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
): WeightedKernelAccountClient<
    TEntryPoint,
    TTransport,
    TChain,
    TSmartAccount
> => {
    const {
        key = "Account",
        name = "Weighted Kernel Account Client",
        middleware
    } = parameters

    const client = createKernelAccountClient({
        ...parameters,
        name,
        key
    })

    return client.extend(
        weightedKernelAccountClientActions({
            middleware
        })
    ) as WeightedKernelAccountClient<
        TEntryPoint,
        TTransport,
        TChain,
        TSmartAccount
    >
}
