import { getEntryPointVersion } from "permissionless"
import type { EntryPoint } from "permissionless/types/entrypoint"
import {
    http,
    type Account,
    type Chain,
    type Client,
    type PublicClientConfig,
    type Transport,
    createClient
} from "viem"
import type { ZeroDevPaymasterRpcSchema } from "../types/kernel.js"
import {
    type ZeroDevPaymasterClientActions,
    zerodevPaymasterActions
} from "./decorators/kernel.js"
import { isProviderSet, setPimlicoAsProvider } from "./utils.js"

export type ZeroDevPaymasterClient<entryPoint extends EntryPoint> = Client<
    Transport,
    Chain | undefined,
    Account | undefined,
    ZeroDevPaymasterRpcSchema<entryPoint>,
    ZeroDevPaymasterClientActions<entryPoint>
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
    entryPoint extends EntryPoint,
    transport extends Transport,
    chain extends Chain | undefined = undefined
>(
    parameters: PublicClientConfig<transport, chain> & {
        entryPoint: entryPoint
    }
): ZeroDevPaymasterClient<entryPoint> => {
    const {
        key = "public",
        name = "ZeroDev Paymaster Client",
        entryPoint: entryPointAddress,
        transport
    } = parameters
    const entryPointVersion = getEntryPointVersion(entryPointAddress)
    const shouldIncludePimlicoProvider =
        transport({}).config.key === "http" && entryPointVersion === "v0.7"
    const client = createClient({
        ...parameters,
        transport: (opts) => {
            let _transport = transport({
                ...opts,
                retryCount: 0
            })
            if (
                !shouldIncludePimlicoProvider ||
                isProviderSet(_transport.value?.url, "ALCHEMY") ||
                isProviderSet(_transport.value?.url, "ZERODEV")
            )
                return _transport
            _transport = http(setPimlicoAsProvider(_transport.value?.url))({
                ...opts,
                retryCount: 0
            })
            return _transport
        },
        key,
        name,
        type: "zerodevPaymasterClient"
    })
    return client.extend(zerodevPaymasterActions(parameters.entryPoint))
}
