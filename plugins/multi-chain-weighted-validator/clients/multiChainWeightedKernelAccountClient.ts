import {
    createKernelAccountClient,
    type KernelAccountClientActions
} from "@zerodev/sdk"
import type { SmartAccountClientConfig } from "@zerodev/sdk/clients"
import type {
    Chain,
    Client,
    Transport,
    RpcSchema,
    BundlerRpcSchema,
    Prettify
} from "viem"
import {
    type MultiChainWeightedKernelAccountClientActions,
    multiChainWeightedKernelAccountClientActions
} from "./decorators/multiChainWeightedKernelAccountClient.js"
import type {
    BundlerActions,
    BundlerClientConfig,
    SmartAccount
} from "viem/account-abstraction"

export type MultiChainWeightedKernelAccountClient<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends SmartAccount | undefined = SmartAccount | undefined,
    client extends Client | undefined = Client | undefined,
    rpcSchema extends RpcSchema | undefined = undefined
> = Prettify<
    Client<
        transport,
        chain extends Chain
            ? chain
            : // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            client extends Client<any, infer chain>
            ? chain
            : undefined,
        account,
        rpcSchema extends RpcSchema
            ? [...BundlerRpcSchema, ...rpcSchema]
            : BundlerRpcSchema,
        BundlerActions<account> &
            KernelAccountClientActions<chain, account> &
            MultiChainWeightedKernelAccountClientActions
    >
> & {
    client: client
    paymaster: BundlerClientConfig["paymaster"] | undefined
    paymasterContext: BundlerClientConfig["paymasterContext"] | undefined
    userOperation: BundlerClientConfig["userOperation"] | undefined
}

export function createMultiChainWeightedKernelAccountClient<
    transport extends Transport,
    chain extends Chain | undefined = undefined,
    account extends SmartAccount | undefined = undefined,
    client extends Client | undefined = undefined,
    rpcSchema extends RpcSchema | undefined = undefined
>(
    parameters: SmartAccountClientConfig<
        transport,
        chain,
        account,
        client,
        rpcSchema
    >
): MultiChainWeightedKernelAccountClient<
    transport,
    chain,
    account,
    client,
    rpcSchema
>

export function createMultiChainWeightedKernelAccountClient(
    parameters: SmartAccountClientConfig
): MultiChainWeightedKernelAccountClient {
    const {
        client: client_,
        key = "Account",
        name = "Multi Chain Weighted Kernel Account Client",
        paymaster,
        paymasterContext,
        bundlerTransport,
        userOperation
    } = parameters

    const client = Object.assign(
        createKernelAccountClient({
            ...parameters,
            chain: parameters.chain ?? client_?.chain,
            bundlerTransport,
            key,
            name
        }),
        {
            client: client_,
            paymaster,
            paymasterContext,
            userOperation,
            type: "multiChainWeightedKernelAccountClient"
        }
    )

    return client.extend(
        multiChainWeightedKernelAccountClientActions()
    ) as MultiChainWeightedKernelAccountClient
}
