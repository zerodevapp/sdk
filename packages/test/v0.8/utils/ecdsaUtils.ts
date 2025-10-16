import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    createKernelAccount,
    createKernelAccountClient
} from "@zerodev/sdk"
import type { GetKernelVersion, PluginMigrationData } from "@zerodev/sdk/types"
import { http, type Chain, type Hex, type Transport } from "viem"
import type { EntryPointVersion, SmartAccount } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
    defaultIndex,
    defaultKernelVersion,
    getEntryPoint,
    getProjectId,
    getPublicClient,
    getTestingChain,
    getZeroDevPaymasterClient,
    getZeroDevRpc
} from "./common"

export const getEcdsaKernelAccountWithRandomSigner = async (
    initConfig?: Hex[],
    chain?: number,
    _kernelVersion?: GetKernelVersion<"0.8">,
    pluginMigrations?: PluginMigrationData[]
) => {
    return getEcdsaKernelAccountWithPrivateKey({
        privateKey: generatePrivateKey(),
        initConfig,
        chain,
        kernelVersion: _kernelVersion,
        pluginMigrations
    })
}

export const getEcdsaKernelAccountWithPrivateKey = async ({
    privateKey,
    initConfig,
    chain,
    kernelVersion,
    pluginMigrations,
    index
}: {
    privateKey: Hex
    initConfig?: Hex[]
    chain?: number
    kernelVersion?: GetKernelVersion<"0.8">
    pluginMigrations?: PluginMigrationData[]
    index?: bigint
}): Promise<SmartAccount<KernelSmartAccountImplementation<"0.8">>> => {
    if (!privateKey) {
        throw new Error("privateKey cannot be empty")
    }
    const kernelVersion_ = kernelVersion ?? defaultKernelVersion
    const index_ = index ?? defaultIndex

    const publicClient = await getPublicClient(chain)
    const signer = privateKeyToAccount(privateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer,
        kernelVersion: kernelVersion_
    })

    return createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaValidatorPlugin
        },
        index: index_,
        kernelVersion: kernelVersion_,
        initConfig,
        pluginMigrations,
        // TODO: use meta fatory
        useMetaFactory: false
    })
}

export const getSignerToEcdsaKernelAccount = async ({
    chain
}: { chain?: number } = {}) => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    return getEcdsaKernelAccountWithPrivateKey({
        privateKey,
        chain
    })
}

export const getKernelAccountClient = async <
    entryPointVersion extends EntryPointVersion = "0.8"
>({
    chainId,
    account
}: {
    chainId?: number
    account?: SmartAccount<KernelSmartAccountImplementation<entryPointVersion>>
} = {}): Promise<
    KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation<"0.8">>
    >
> => {
    const chain = getTestingChain(chainId)
    const resolvedAccount = account ?? (await getSignerToEcdsaKernelAccount())
    const projectId = getProjectId(chain.id)
    const paymaster = getZeroDevPaymasterClient(chain.id)

    return createKernelAccountClient({
        account: resolvedAccount,
        chain,
        bundlerTransport: http(getZeroDevRpc(chain.id, projectId), {
            timeout: 100_000
        }),
        paymaster
    }) as KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation<"0.8">>
    >
}
