import type { FallbackTransport, Transport, TransportConfig } from "viem"
import {
    TransactionRejectedRpcError,
    UserRejectedRequestError,
    createTransport
} from "viem"

export type OnResponseFn = (
    args: {
        method: string
        params: unknown[]
        transport: ReturnType<Transport>
    } & (
        | {
              error?: never
              response: unknown
              status: "success"
          }
        | {
              error: Error
              response?: never
              status: "error"
          }
    )
) => void

function shouldThrow(error: Error) {
    if ("code" in error && typeof error.code === "number") {
        if (
            error.code === TransactionRejectedRpcError.code ||
            error.code === UserRejectedRequestError.code ||
            error.code === 5000 // CAIP UserRejectedRequestError
        )
            return true
    }
    return false
}

export type SuccessfulIndex = {
    index: number
}

export type TransportPair = {
    bundlerTransport: Transport
    paymasterTransport: Transport
}

export type FallbackTransportConfig = {
    /** The key of the Fallback transport. */
    key?: TransportConfig["key"]
    /** The name of the Fallback transport. */
    name?: TransportConfig["name"]
    /** The max number of times to retry. */
    retryCount?: TransportConfig["retryCount"]
    /** The base delay (in ms) between retries. */
    retryDelay?: TransportConfig["retryDelay"]
}

export function createFallbackTransport(
    transportPairs: TransportPair[],
    config: FallbackTransportConfig = {},
    successfulIndex: SuccessfulIndex = { index: -1 }
): {
    bundlerFallbackTransport: FallbackTransport
    paymasterFallbackTransport: FallbackTransport
} {
    const {
        key = "fallback",
        name = "Fallback",
        retryCount, // @dev when retryCount is undefined, it will default to 3 in viem
        retryDelay
    } = config

    const createTransportInstance = (isBundler: boolean): FallbackTransport => {
        return ({ chain, pollingInterval = 2_000, timeout, ...rest }) => {
            let onResponse: OnResponseFn = () => {}

            return createTransport(
                {
                    key,
                    name,
                    async request({ method, params }) {
                        const fetch = async (
                            i = Math.max(0, successfulIndex.index)
                            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                        ): Promise<any> => {
                            console.log("fetch", i, isBundler, method)
                            const transport = isBundler
                                ? transportPairs[i].bundlerTransport
                                : transportPairs[i].paymasterTransport
                            const configuredTransport = transport({
                                ...rest,
                                chain,
                                retryCount: 0,
                                timeout
                            })
                            try {
                                const response =
                                    await configuredTransport.request({
                                        method,
                                        params
                                        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                                    } as any)
                                onResponse({
                                    method,
                                    params: params as unknown[],
                                    response,
                                    transport: configuredTransport,
                                    status: "success"
                                })
                                successfulIndex.index = i
                                return response
                            } catch (err) {
                                console.log("error", err)

                                onResponse({
                                    error: err as Error,
                                    method,
                                    params: params as unknown[],
                                    transport: configuredTransport,
                                    status: "error"
                                })

                                if (shouldThrow(err as Error)) throw err

                                if (i === transportPairs.length - 1) throw err

                                return fetch(i + 1)
                            }
                        }
                        return fetch()
                    },
                    retryCount,
                    retryDelay,
                    type: "fallback"
                },
                {
                    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
                    onResponse: (fn: OnResponseFn) => (onResponse = fn),
                    transports: transportPairs
                        .map((pair) =>
                            isBundler
                                ? pair.bundlerTransport
                                : pair.paymasterTransport
                        )
                        .map((fn) => fn({ chain, retryCount: 0 }))
                }
            )
        }
    }

    return {
        bundlerFallbackTransport: createTransportInstance(true),
        paymasterFallbackTransport: createTransportInstance(false)
    }
}
