import {
    type Chain,
    type Client,
    type ClientConfig,
    type Prettify,
    type PublicClientConfig,
    type RpcSchema,
    type Transport,
    createClient
} from "viem"
import {
    type PaymasterActions,
    type SmartAccount,
    paymasterActions
} from "viem/account-abstraction"
import type { ZeroDevPaymasterRpcSchema } from "../types/kernel.js"
import {
    type ZeroDevPaymasterClientActions,
    zerodevPaymasterActions
} from "./decorators/kernel.js"

export type ZeroDevPaymasterClient<
    entryPointVersion extends "0.6" | "0.7" = "0.7",
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
            : // biome-ignore lint/suspicious/noExplicitAny: We need any to infer the chain type
              client extends Client<any, infer chain>
              ? chain
              : undefined,
        account,
        rpcSchema extends RpcSchema
            ? [...ZeroDevPaymasterRpcSchema<entryPointVersion>, ...rpcSchema]
            : ZeroDevPaymasterRpcSchema<entryPointVersion>,
        PaymasterActions & ZeroDevPaymasterClientActions
    >
>

export type ZeroDevPaymasterClientConfig<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends SmartAccount | undefined = SmartAccount | undefined,
    rpcSchema extends RpcSchema | undefined = undefined
> = Prettify<
    Pick<
        ClientConfig<transport, chain, account, rpcSchema>,
        | "account"
        | "cacheTime"
        | "chain"
        | "key"
        | "name"
        | "pollingInterval"
        | "rpcSchema"
        | "transport"
    >
>
/**
 * Creates a ZeroDev-specific Paymaster Client with a given [Transport](https://viem.sh/docs/clients/intro.html) configured for a [Chain](https://viem.sh/docs/clients/chains.html).
 *
 * - Docs: https://docs.zerodev.app/meta-infra/getting-started/intro
 *
 * @param config - {@link PublicClientConfig}
 * @returns A ZeroDev Paymaster Client. {@link ZeroDevPaymasterClient}
 *
 * @example
 * import { createPublicClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 *
 * const zerodevPaymasterClient = createZeroDevPaymasterClient({
 *   chain: mainnet,
 *   transport: http(`https://rpc.zerodev.app/api/v2/paymaster/${projectId}`),
 * })
 */
export const createZeroDevPaymasterClient = (
    parameters: ZeroDevPaymasterClientConfig
): ZeroDevPaymasterClient => {
    const {
        key = "public",
        name = "ZeroDev Paymaster Client",
        transport
    } = parameters
    const client = createClient({
        ...parameters,
        transport: (opts) => {
            return transport({
                ...opts,
                retryCount: 0
            })
        },
        key,
        name,
        type: "zerodevPaymasterClient"
    })
    return client.extend(paymasterActions).extend(zerodevPaymasterActions())
}
