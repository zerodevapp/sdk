import type { SmartAccount } from "permissionless/accounts/types"
import type { SponsorUserOperationMiddleware } from "permissionless/actions/smartAccount"
import type { Prettify } from "permissionless/types"
import type { BundlerRpcSchema } from "permissionless/types/bundler"
import {
    type Chain,
    type Client,
    type ClientConfig,
    type ParseAccount,
    type Transport,
    createClient
} from "viem"
import {
    type KernelAccountClientActions,
    kernelAccountClientActions
} from "./decorators/kernel"

export type KernelAccountClient<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends SmartAccount | undefined = SmartAccount | undefined
> = Prettify<
    Client<
        transport,
        chain,
        account,
        BundlerRpcSchema,
        KernelAccountClientActions<chain, account>
    >
>

export type SmartAccountClientConfig<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined
> = Prettify<
    Pick<
        ClientConfig<transport, chain, TAccount>,
        | "account"
        | "cacheTime"
        | "chain"
        | "key"
        | "name"
        | "pollingInterval"
        | "transport"
    >
>

export const createKernelAccountClient = <
    TTransport extends Transport,
    TChain extends Chain | undefined = undefined,
    TSmartAccount extends SmartAccount | undefined = undefined
>(
    parameters: SmartAccountClientConfig<TTransport, TChain, TSmartAccount> &
        SponsorUserOperationMiddleware
): KernelAccountClient<TTransport, TChain, ParseAccount<TSmartAccount>> => {
    const {
        key = "Account",
        name = "Kernel Account Client",
        transport
    } = parameters
    const client = createClient({
        ...parameters,
        key,
        name,
        transport: (opts) => transport({ ...opts, retryCount: 0 }),
        type: "kernelAccountClient"
    })

    return client.extend(
        kernelAccountClientActions({
            sponsorUserOperation: parameters.sponsorUserOperation
        })
    )
}
