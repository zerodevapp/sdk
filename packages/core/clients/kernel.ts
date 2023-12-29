import {
    type Account,
    type Chain,
    type Client,
    type PublicClientConfig,
    type Transport,
    createClient
} from "viem"
import { type KernelPaymasterRpcSchema } from "../types/kernel"
import {
    type KernelPaymasterClientActions,
    kernelPaymasterActions
} from "./decorators/kernel"

export type KernelPaymasterClient = Client<
    Transport,
    Chain | undefined,
    Account | undefined,
    KernelPaymasterRpcSchema,
    KernelPaymasterClientActions
>
/**
 * Creates a pimlico specific Paymaster Client with a given [Transport](https://viem.sh/docs/clients/intro.html) configured for a [Chain](https://viem.sh/docs/clients/chains.html).
 *
 * - Docs: https://docs.pimlico.io/permissionless/reference/clients/pimlicoPaymasterClient
 *
 * A Pimlico Paymaster Client is an interface to "pimlico paymaster endpoints" [JSON-RPC API](https://docs.pimlico.io/reference/verifying-paymaster/endpoints) methods such as sponsoring user operation, etc through Pimlico Paymaster Actions.
 *
 * @param config - {@link PublicClientConfig}
 * @returns A Pimlico Paymaster Client. {@link KernelPaymasterClient}
 *
 * @example
 * import { createPublicClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 *
 * const pimlicoPaymasterClient = createKernelPaymasterClient({
 *   chain: mainnet,
 *   transport: http("https://api.pimlico.io/v2/goerli/rpc?apikey=YOUR_API_KEY_HERE"),
 * })
 */
export const createKernelPaymasterClient = <
    transport extends Transport,
    chain extends Chain | undefined = undefined
>(
    parameters: PublicClientConfig<transport, chain>
): KernelPaymasterClient => {
    const { key = "public", name = "Pimlico Paymaster Client" } = parameters
    const client = createClient({
        ...parameters,
        key,
        name,
        type: "pimlicoPaymasterClient"
    })
    return client.extend(kernelPaymasterActions)
}
