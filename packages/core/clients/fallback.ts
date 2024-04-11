import type { FallbackTransport, Transport, TransportConfig } from "viem"
import {
    TransactionRejectedRpcError,
    UserRejectedRequestError,
    createTransport
} from "viem"

// type SortOptions = {
//     /**
//      * The polling interval (in ms).
//      * @default client.pollingInterval
//      */
//     interval?: number
//     /**
//      * Timeout when testing transports.
//      * @default 1_000
//      */
//     timeout?: number
// }

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
        retryCount,
        retryDelay
    } = config

    console.log("createFallbackTransport", retryCount, retryDelay)

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
                            console.log("fetch", i)
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

// export function adjustTransportPairs({
//     failedIndex,
//     transportPairs
// }: {
//     failedIndex: number
//     transportPairs: TransportPair[]
// }) {
//     const failedPair = transportPairs.splice(failedIndex, 1)[0]
//     transportPairs.push(failedPair)
// }

// export function sortTransportPairs({
//     chain,
//     interval = 2_000,
//     onPairTransports,
//     timeout = 1_000,
//     bundlerTransports,
//     paymasterTransports
// }: {
//     chain?: Chain
//     interval?: SortOptions["interval"]
//     onPairTransports: (
//         bundlerTransports: Transport[],
//         paymasterTransports: Transport[]
//     ) => void
//     timeout?: SortOptions["timeout"]
//     bundlerTransports: Transport[]
//     paymasterTransports: Transport[]
// }) {
//     type pairData = { priority: number; success: boolean }

//     const sortTransports_ = async () => {
//         const pairData: pairData[] = await Promise.all(
//             bundlerTransports.map(async (transport, i) => {
//                 const bundlerTransport_ = transport({
//                     chain,
//                     retryCount: 0,
//                     timeout
//                 })
//                 const paymasterTransport_ = paymasterTransports[i]({
//                     chain,
//                     retryCount: 0,
//                     timeout
//                 })

//                 let success: boolean
//                 try {
//                     await Promise.all([
//                         bundlerTransport_.request({ method: "net_listening" }),
//                         paymasterTransport_.request({ method: "net_listening" })
//                     ])
//                     success = true
//                 } catch {
//                     success = false
//                 }
//                 return { priority: i, success }
//             })
//         )

//         const sortedPairData = pairData.sort((a, b) => {
//             if (a.success === b.success) {
//                 return a.priority - b.priority // Sort by priority if success status is the same
//             }
//             return a.success ? -1 : 1 // Successful ones first
//         })

//         const sortedBundlerTransports = sortedPairData.map(
//             (data) => bundlerTransports[data.priority]
//         )
//         const sortedPaymasterTransports = sortedPairData.map(
//             (data) => paymasterTransports[data.priority]
//         )

//         onPairTransports(sortedBundlerTransports, sortedPaymasterTransports)

//         await wait(interval)
//         sortTransports_()
//     }
//     sortTransports_()
// }
