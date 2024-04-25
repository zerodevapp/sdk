import type { EntryPoint } from "permissionless/types"
import { type Chain, type Transport } from "viem"
import { type KernelSmartAccount } from "../accounts/index.js"
import { type KernelAccountClient } from "./kernelAccountClient.js"

export const createFallbackKernelAccountClient = <
    TEntryPoint extends EntryPoint,
    TTransport extends Transport,
    TChain extends Chain | undefined,
    TSmartAccount extends KernelSmartAccount<TEntryPoint> | undefined
>(
    clients: Array<
        KernelAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount>
    >
): KernelAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount> => {
    const proxyClient = new Proxy(clients[0], {
        get(_target, prop, receiver) {
            for (const client of clients) {
                const value = Reflect.get(client, prop, receiver)
                if (value !== undefined) {
                    // If the property is a function, wrap it to add fallback logic
                    if (typeof value === "function") {
                        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                        return async (...args: any[]) => {
                            for (let i = 0; i < clients.length; i++) {
                                try {
                                    const method = Reflect.get(
                                        clients[i],
                                        prop,
                                        receiver
                                    )
                                    if (typeof method === "function") {
                                        // Attempt to call the function on the current client
                                        return await method(...args)
                                    }
                                } catch (error) {
                                    console.error(
                                        `Action ${String(
                                            prop
                                        )} failed with client ${
                                            client.transport.url
                                        }, trying next if available.`,
                                        error
                                    )
                                    if (i === clients.length - 1) {
                                        throw error
                                    }
                                }
                            }
                        }
                    }
                    // For non-function properties, return the first defined value found
                    return value
                }
            }
            // If no clients have a defined value for the property, return undefined
            return undefined
        }
    })

    return proxyClient
}
