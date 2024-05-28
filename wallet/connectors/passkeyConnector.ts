import {
    ChainNotConfiguredError,
    type Connector,
    createConnector
} from "@wagmi/core"
import {
    createPasskeyValidator,
    getPasskeyValidator
} from "@zerodev/passkey-validator"
import {
    type KernelValidator,
    createKernelAccount,
    createKernelAccountClient
} from "@zerodev/sdk"
import type { EntryPoint } from "permissionless/types"
import {
    http,
    type AddEthereumChainParameter,
    type Chain,
    type ProviderRpcError,
    SwitchChainError,
    UserRejectedRequestError,
    createPublicClient,
    getAddress,
    numberToHex
} from "viem"
import {
    KernelEIP1193Provider,
    type KernelEIP1193Provider as KernelEIP1193ProviderType
} from "../KernelEIP1193Provider"
import type { ZeroDevVersion } from "../types"
import { ZERODEV_BUNDLER_URL, ZERODEV_PASSKEY_URL } from "../utils/constants"
import {
    getWebauthnValidatorAddress,
    getZerodevSigner,
    setZerodevSigner
} from "../utils/passkey"
import { getEntryPointFromZeroDevVersion } from "../utils/provider"

passkeyConnector.type = "passkeyConnector" as const
export function passkeyConnector(
    projectId: string,
    chain: Chain,
    version: ZeroDevVersion,
    appName?: string
) {
    const passkeyName = appName ?? "ZeroDev Passkey Wallet"

    type Provider = KernelEIP1193ProviderType<EntryPoint> | undefined
    let walletProvider: Provider | undefined

    let accountsChanged: Connector["onAccountsChanged"] | undefined
    let chainChanged: Connector["onChainChanged"] | undefined
    let disconnect: Connector["onDisconnect"] | undefined

    return createConnector<Provider>((config) => ({
        id: "zerodevPasskeySDK",
        name: "Passkey",
        supportsSimulation: true,
        type: passkeyConnector.type,

        async connect({ chainId } = {}) {
            try {
                if (chainId && chain.id !== chainId) {
                    throw new Error(
                        `Incorrect chain Id: ${chainId} should be ${chain.id}`
                    )
                }

                const provider = await this.getProvider()
                if (provider) {
                    const accounts = (
                        (await provider.request({
                            method: "eth_requestAccounts"
                        })) as string[]
                    ).map((x) => getAddress(x))
                    if (!accountsChanged) {
                        accountsChanged = this.onAccountsChanged.bind(this)
                        provider.on("accountsChanged", accountsChanged)
                    }
                    if (!chainChanged) {
                        chainChanged = this.onChainChanged.bind(this)
                        provider.on("chainChanged", chainChanged)
                    }
                    if (!disconnect) {
                        disconnect = this.onDisconnect.bind(this)
                        provider.on("disconnect", disconnect)
                    }
                    return { accounts, chainId: chain.id }
                }

                const entryPoint = getEntryPointFromZeroDevVersion(version)
                const webauthnValidator =
                    getWebauthnValidatorAddress(entryPoint)

                const passkeySigner = getZerodevSigner()
                let passkeyValidator: KernelValidator<EntryPoint>

                const publicClient = createPublicClient({
                    chain,
                    transport: http()
                })
                if (passkeySigner) {
                    passkeyValidator = await getPasskeyValidator(publicClient, {
                        passkeyServerUrl: `${ZERODEV_PASSKEY_URL}/${projectId}`,
                        entryPoint: entryPoint
                    })
                } else {
                    passkeyValidator = await createPasskeyValidator(
                        publicClient,
                        {
                            passkeyName: passkeyName,
                            passkeyServerUrl: `${ZERODEV_PASSKEY_URL}/${projectId}`,
                            entryPoint: entryPoint,
                            validatorAddress: webauthnValidator
                        }
                    )
                }
                const passkeyData = (
                    passkeyValidator as KernelValidator<
                        EntryPoint,
                        "WebAuthnValidator"
                    > & {
                        getSerializedData: () => string
                    }
                ).getSerializedData()
                setZerodevSigner(passkeyData, true)

                const kernelAccount = await createKernelAccount(publicClient, {
                    entryPoint: entryPoint,
                    plugins: {
                        sudo: passkeyValidator
                    }
                })
                const kernelClient = createKernelAccountClient({
                    account: kernelAccount,
                    chain,
                    entryPoint: entryPoint,
                    bundlerTransport: http(
                        `${ZERODEV_BUNDLER_URL}/${projectId}`
                    )
                })
                walletProvider = new KernelEIP1193Provider(kernelClient)

                return { accounts: [kernelAccount.address], chainId: chain.id }
            } catch (error) {
                if (
                    /(user closed modal|accounts received is empty|user denied account)/i.test(
                        (error as Error).message
                    )
                )
                    throw new UserRejectedRequestError(error as Error)
                throw error
            }
        },

        async disconnect() {
            const provider = await this.getProvider()
            if (accountsChanged) {
                provider?.removeListener("accountsChanged", accountsChanged)
                accountsChanged = undefined
            }
            if (chainChanged) {
                provider?.removeListener("chainChanged", chainChanged)
                chainChanged = undefined
            }
            if (disconnect) {
                provider?.removeListener("disconnect", disconnect)
                disconnect = undefined
            }
            walletProvider = undefined
            const serializedData = getZerodevSigner()
            if (serializedData) {
                setZerodevSigner(serializedData.signer, false)
            }
        },

        async getAccounts() {
            const provider = await this.getProvider()
            if (!provider) return []

            return (
                (await provider.request({
                    method: "eth_accounts"
                })) as string[]
            ).map((x) => getAddress(x))
        },

        async getChainId() {
            const provider = await this.getProvider()
            if (!provider) return chain.id

            const chainId = await provider.request({ method: "eth_chainId" })
            return Number(chainId as number)
        },

        async getProvider() {
            return walletProvider
        },

        async isAuthorized() {
            try {
                const accounts = await this.getAccounts()
                return !!accounts.length
            } catch {
                return false
            }
        },

        async switchChain({ addEthereumChainParameter, chainId }) {
            const chain = config.chains.find((chain) => chain.id === chainId)
            if (!chain)
                throw new SwitchChainError(new ChainNotConfiguredError())

            const provider = await this.getProvider()
            if (!provider)
                throw new SwitchChainError(new Error("Not Connected"))

            try {
                await provider.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: numberToHex(chain.id) }]
                })
                return chain
            } catch (error) {
                // Indicates chain is not added to provider
                if ((error as ProviderRpcError).code === 4902) {
                    try {
                        let blockExplorerUrls: string[]
                        if (addEthereumChainParameter?.blockExplorerUrls)
                            blockExplorerUrls =
                                addEthereumChainParameter.blockExplorerUrls
                        else
                            blockExplorerUrls = chain.blockExplorers?.default
                                .url
                                ? [chain.blockExplorers?.default.url]
                                : []

                        let rpcUrls: readonly string[]
                        if (addEthereumChainParameter?.rpcUrls?.length)
                            rpcUrls = addEthereumChainParameter.rpcUrls
                        else rpcUrls = [chain.rpcUrls.default?.http[0] ?? ""]

                        const addEthereumChain = {
                            blockExplorerUrls,
                            chainId: numberToHex(chainId),
                            chainName:
                                addEthereumChainParameter?.chainName ??
                                chain.name,
                            iconUrls: addEthereumChainParameter?.iconUrls,
                            nativeCurrency:
                                addEthereumChainParameter?.nativeCurrency ??
                                chain.nativeCurrency,
                            rpcUrls
                        } satisfies AddEthereumChainParameter

                        await provider.request({
                            method: "wallet_addEthereumChain",
                            params: [addEthereumChain]
                        })

                        return chain
                    } catch (error) {
                        throw new UserRejectedRequestError(error as Error)
                    }
                }

                throw new SwitchChainError(error as Error)
            }
        },

        onAccountsChanged(accounts) {
            if (accounts.length === 0) this.onDisconnect()
            else
                config.emitter.emit("change", {
                    accounts: accounts.map((x) => getAddress(x))
                })
        },

        onChainChanged(chain) {
            const chainId = Number(chain)
            config.emitter.emit("change", { chainId })
        },

        async onDisconnect(_error) {
            config.emitter.emit("disconnect")

            const provider = await this.getProvider()
            if (!provider) return

            if (accountsChanged) {
                provider.removeListener("accountsChanged", accountsChanged)
                accountsChanged = undefined
            }
            if (chainChanged) {
                provider.removeListener("chainChanged", chainChanged)
                chainChanged = undefined
            }
            if (disconnect) {
                provider.removeListener("disconnect", disconnect)
                disconnect = undefined
            }
            walletProvider = undefined
            const serializedData = getZerodevSigner()
            if (serializedData) {
                setZerodevSigner(serializedData.signer, false)
            }
        }
    }))
}
