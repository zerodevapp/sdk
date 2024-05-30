import type { EntryPoint } from "permissionless/types"
import type { Chain, Transport } from "viem"
import type { KernelSmartAccount } from "../accounts/index.js"
import type { KernelAccountClient } from "./kernelAccountClient.js"

export const createFallbackKernelAccountClient = <
    TEntryPoint extends EntryPoint,
    TTransport extends Transport,
    TChain extends Chain | undefined,
    TSmartAccount extends KernelSmartAccount<TEntryPoint> | undefined
>(
    clients: Array<
        KernelAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount>
    >,
    onError?: (error: Error, clientUrl: string) => Promise<void>
): KernelAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount> => {
    // Function to create a fallback method for a given property.
    // This method will try each client in sequence until one succeeds or all fail.
    function createFallbackMethod(prop: PropertyKey) {
        // biome-ignore lint/suspicious/noExplicitAny: expected any
        return async (...args: any[]) => {
            for (let i = 0; i < clients.length; i++) {
                try {
                    const method = Reflect.get(clients[i], prop)
                    if (typeof method === "function") {
                        return await method(...args)
                    }
                } catch (error) {
                    console.error(
                        `Action ${String(prop)} failed with client ${
                            clients[i].transport.url
                        }, trying next if available.`
                    )
                    // Call the error handler if provided.
                    if (onError !== undefined) {
                        await onError(error as Error, clients[i].transport.url)
                    }
                    if (i === clients.length - 1) {
                        throw error
                    }
                }
            }
        }
    }

    const proxyClient = new Proxy(clients[0], {
        get(_target, prop, receiver) {
            if (prop === "extend") {
                // biome-ignore lint/suspicious/noExplicitAny: expected any
                return (fn: any) => {
                    const modifications = fn(proxyClient)
                    for (const [key, modification] of Object.entries(
                        modifications
                    )) {
                        if (typeof modification === "function") {
                            // biome-ignore lint/suspicious/noExplicitAny: expected any
                            ;(proxyClient as any)[key] = async (
                                // biome-ignore lint/suspicious/noExplicitAny: expected any
                                ...args: any[]
                            ) => {
                                return modification(...args)
                            }
                        } else {
                            console.error(
                                `Expected a function for modification of ${key}, but received type ${typeof modification}`
                            )
                        }
                    }
                    return proxyClient
                }
            }

            const value = Reflect.get(_target, prop, receiver)
            if (typeof value === "function") {
                return createFallbackMethod(prop)
            }
            return value
        }
    })

    return proxyClient
}
