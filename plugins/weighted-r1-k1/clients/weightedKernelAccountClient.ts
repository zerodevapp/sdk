import {
    type KernelAccountClientActions,
    createKernelAccountClient
} from "@zerodev/sdk"
import type { SmartAccountClientConfig } from "@zerodev/sdk/clients"
import type {
    BundlerRpcSchema,
    Chain,
    Client,
    Prettify,
    RpcSchema,
    Transport
} from "viem"
import type { BundlerActions, SmartAccount } from "viem/account-abstraction"
import {
    type WeightedKernelAccountClientActions,
    weightedKernelAccountClientActions
} from "./decorators/weightedKernelAccountClient.js"

export type WeightedKernelAccountClient<
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
            WeightedKernelAccountClientActions<chain, account>
    >
>

export function createWeightedKernelAccountClient<
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
): WeightedKernelAccountClient<transport, chain, account, client, rpcSchema>

export function createWeightedKernelAccountClient(
    parameters: SmartAccountClientConfig
): WeightedKernelAccountClient {
    const {
        client: client_,
        key = "Account",
        name = "Weighted Kernel Account Client",
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
            type: "weightedKernelAccountClient"
        }
    )

    return client.extend(
        weightedKernelAccountClientActions()
    ) as WeightedKernelAccountClient
}
