import {
    type Account,
    type Chain,
    type Client,
    type PublicClientConfig,
    type Transport,
    createClient
} from "viem"
import type { ZeroDevPaymasterRpcSchema } from "../types/kernel"
import {
    type ZeroDevPaymasterClientActions,
    zerodevPaymasterActions
} from "./decorators/kernel"

export type ZeroDevPaymasterClient = Client<
    Transport,
    Chain | undefined,
    Account | undefined,
    ZeroDevPaymasterRpcSchema,
    ZeroDevPaymasterClientActions
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
export const createZeroDevPaymasterClient = <
    transport extends Transport,
    chain extends Chain | undefined = undefined
>(
    parameters: PublicClientConfig<transport, chain>
): ZeroDevPaymasterClient => {
    const { key = "public", name = "ZeroDev Paymaster Client" } = parameters
    const client = createClient({
        ...parameters,
        key,
        name,
        type: "zerodevPaymasterClient"
    })
    return client.extend(zerodevPaymasterActions)
}
