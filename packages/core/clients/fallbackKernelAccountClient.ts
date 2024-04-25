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
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            return async (...args: any[]) => {
                for (let i = 0; i < clients.length; i++) {
                    try {
                        const value = Reflect.get(clients[i], prop, receiver)
                        if (typeof value === "function") {
                            return await value.apply(clients[i], args)
                        } else {
                            return value
                        }
                    } catch (error) {
                        console.error(
                            `Action ${String(prop)} failed with client ${
                                clients[i].transport.url
                            }, trying next if available.`,
                            error
                        )
                        // If all clients fail, throw the last encountered error
                        if (i === clients.length - 1) {
                            throw error
                        }
                    }
                }
                // If no clients have the property, return undefined
                return undefined
            }
        }
    })

    return proxyClient
}
