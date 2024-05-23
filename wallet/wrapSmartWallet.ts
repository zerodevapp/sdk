import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk"
import { KernelEIP1193Provider } from "@zerodev/wallet"
import {
    ENTRYPOINT_ADDRESS_V07,
    walletClientToSmartAccountSigner
} from "permissionless"
import {
    http,
    createClient,
    createPublicClient,
    custom,
    walletActions
} from "viem"
import type { GetWalletClientReturnType } from "wagmi/actions"

export const wrapSmartWallet = (walletFunction: any, projectId: string) => {
    return (config: any) => {
        const wallet = walletFunction(config)
        let kernelProvider: any

        return new Proxy(wallet, {
            set(target, prop, value, receiver) {
                return Reflect.set(target, prop, value, receiver)
            },
            get(target, prop, receiver) {
                const source = Reflect.get(target, prop, receiver)
                if (prop === "setup") {
                    return async (params: any) => {
                        return target.setup(params)
                    }
                }
                if (prop === "connect") {
                    return async (params: any) => {
                        await target.connect(params)

                        const provider = await target.getProvider()
                        const accounts = await target.getAccounts()
                        const chainId = await target.getChainId()
                        const chain = config.chains.find(
                            (c: any) => c.id === chainId
                        )
                        const walletClient = createClient({
                            account: accounts[0],
                            chain,
                            name: "Connector Client",
                            transport: (opts) =>
                                custom(provider)({ ...opts, retryCount: 0 })
                        }).extend(walletActions) as GetWalletClientReturnType

                        const publicClient = createPublicClient({
                            chain,
                            transport: http(
                                `https://rpc.zerodev.app/api/v2/bundler/${projectId}`
                            )
                        })
                        const ecdsaValidator = await signerToEcdsaValidator(
                            publicClient,
                            {
                                entryPoint: ENTRYPOINT_ADDRESS_V07,
                                signer: walletClientToSmartAccountSigner(
                                    walletClient
                                )
                            }
                        )
                        const kernelAccount = await createKernelAccount(
                            publicClient,
                            {
                                entryPoint: ENTRYPOINT_ADDRESS_V07,
                                plugins: {
                                    sudo: ecdsaValidator
                                }
                            }
                        )
                        const kernelClient = createKernelAccountClient({
                            account: kernelAccount,
                            chain,
                            entryPoint: ENTRYPOINT_ADDRESS_V07,
                            bundlerTransport: http(
                                `https://rpc.zerodev.app/api/v2/bundler/${projectId}`
                            )
                        })
                        kernelProvider = new KernelEIP1193Provider(kernelClient)

                        return {
                            accounts: [kernelAccount.address],
                            chainId: chain.id
                        }
                    }
                }

                if (prop === "getProvider") {
                    return async () => {
                        if (kernelProvider) {
                            return kernelProvider
                        }
                        return target.getProvider()
                    }
                }

                if (prop === "disconnect") {
                    return async () => {
                        await target.disconnect()
                        kernelProvider = null
                        return
                    }
                }

                return source
            }
        })
    }
}
