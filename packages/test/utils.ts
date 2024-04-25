import { type RequestListener, createServer } from "http"
import type { AddressInfo } from "net"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    type KernelAccountClient,
    type KernelSmartAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { type KernelValidator, createKernelV1Account } from "@zerodev/sdk"
import {
    addressToEmptyAccount,
    createKernelAccount
} from "@zerodev/sdk/accounts"
import { createKernelV2Account } from "@zerodev/sdk/accounts"
import type { Action } from "@zerodev/sdk/types"
import {
    ParamOperator,
    type SessionKeyPlugin,
    deserializeSessionKeyAccount,
    deserializeSessionKeyAccountV2,
    serializeSessionKeyAccount,
    signerToSessionKeyValidator
} from "@zerodev/session-key"
import { createWeightedECDSAValidator } from "@zerodev/weighted-ecdsa-validator"
import { getRecoveryAction } from "@zerodev/weighted-ecdsa-validator/constants.js"
import {
    type BundlerClient,
    ENTRYPOINT_ADDRESS_V06,
    createBundlerClient
} from "permissionless"
import {
    type SmartAccount,
    signerToSimpleSmartAccount
} from "permissionless/accounts"
import type { Middleware } from "permissionless/actions/smartAccount.js"
import type { EntryPoint } from "permissionless/types/entrypoint.js"
import {
    http,
    type AbiItem,
    type Address,
    type Hex,
    type Log,
    type PublicClient,
    type Transport,
    type WalletClient,
    createPublicClient,
    createWalletClient,
    decodeEventLog,
    encodeFunctionData
} from "viem"
import {
    type Account,
    generatePrivateKey,
    privateKeyToAccount
} from "viem/accounts"
import { type Chain, sepolia } from "viem/chains"
import * as allChains from "viem/chains"
import type { Policy } from "../../plugins/modularPermission/policies/types.js"
import { toECDSASigner } from "../../plugins/modularPermission/signers/toECDSASigner.js"
import { createPermissionValidator } from "../../plugins/modularPermission/toModularPermissionValidatorPlugin.js"
import { EntryPointAbi } from "./abis/EntryPoint.js"
import { TEST_ERC20Abi } from "./abis/Test_ERC20Abi.js"
import { config } from "./config.js"

export const Test_ERC20Address = "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"
export const index = 5438533232332340n
const DEFAULT_PROVIDER = "STACKUP"
const projectId = config["v0.6"].sepolia.projectId
export const getFactoryAddress = (): Address => {
    const factoryAddress = process.env.FACTORY_ADDRESS
    if (!factoryAddress) {
        throw new Error("FACTORY_ADDRESS environment variable not set")
    }
    return factoryAddress as Address
}

export const getPrivateKeyAccount = (): Account => {
    const privateKey = process.env.TEST_PRIVATE_KEY
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }
    return privateKeyToAccount(privateKey as Hex)
}

export const getTestingChain = (): Chain => {
    const testChainId = config["v0.6"].sepolia.chainId
    const chainId = testChainId ?? sepolia.id
    const chain = Object.values(allChains).find((c) => c.id === chainId)
    if (!chain) {
        throw new Error(`Chain with id ${chainId} not found`)
    }
    return chain
}

export const getSignerToSimpleSmartAccount = async (): Promise<
    SmartAccount<EntryPoint>
> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)

    return signerToSimpleSmartAccount(publicClient, {
        entryPoint: getEntryPoint(),
        factoryAddress: getFactoryAddress(),
        signer: { ...signer, source: "local" as "local" | "external" }
    })
}

export const getSignerToEcdsaKernelAccount = async <
    entryPoint extends EntryPoint
>(): Promise<KernelSmartAccount<entryPoint>> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    return getEcdsaKernelAccountWithPrivateKey(privateKey)
}

export const getEcdsaKernelAccountWithRandomSigner = async (): Promise<
    KernelSmartAccount<EntryPoint>
> => {
    return getEcdsaKernelAccountWithPrivateKey(generatePrivateKey())
}

export const getEcdsaKernelAccountWithPrivateKey = async <
    entryPoint extends EntryPoint
>(
    privateKey: Hex
): Promise<KernelSmartAccount<entryPoint>> => {
    if (!privateKey) {
        throw new Error("privateKey cannot be empty")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" }
    })

    return createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaValidatorPlugin
        },
        index
    }) as unknown as KernelSmartAccount<entryPoint>
}

export const getKernelV1Account = async (): Promise<
    KernelSmartAccount<EntryPoint>
> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)

    return createKernelV1Account(publicClient, {
        signer,
        index,
        entrypoint: getEntryPoint()
    }) as unknown as KernelSmartAccount<EntryPoint>
}

export const getSignerToEcdsaKernelV2Account = async (): Promise<
    KernelSmartAccount<EntryPoint>
> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        signer,
        validatorAddress: "0x417f5a41305ddc99d18b5e176521b468b2a31b86",
        entryPoint: getEntryPoint()
    })

    return createKernelV2Account(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaValidatorPlugin,
            entryPoint: getEntryPoint()
        },
        index
    }) as unknown as KernelSmartAccount<EntryPoint>
}

export const getSignerToSessionKeyKernelV2Account = async (): Promise<
    KernelSmartAccount<EntryPoint>
> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const sessionPrivateKey = generatePrivateKey()
    const sessionKey = privateKeyToAccount(sessionPrivateKey)
    const sessionKeyEmptyAccount = addressToEmptyAccount(sessionKey.address)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" },
        validatorAddress: "0x417f5a41305ddc99d18b5e176521b468b2a31b86"
    })

    const sessionKeyPlugin = await signerToSessionKeyValidator(publicClient, {
        signer: sessionKeyEmptyAccount,
        entryPoint: getEntryPoint(),
        validatorData: {
            permissions: [
                {
                    target: Test_ERC20Address,
                    abi: TEST_ERC20Abi,
                    functionName: "transfer",
                    args: [
                        {
                            operator: ParamOperator.EQUAL,
                            value: signer.address
                        },
                        null
                    ]
                }
            ]
        }
    })

    const account = await createKernelV2Account(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            regular: sessionKeyPlugin,
            sudo: ecdsaValidatorPlugin,
            entryPoint: getEntryPoint()
        },
        index
    })

    const serializedSessionKeyAccountParams =
        await serializeSessionKeyAccount(account)

    return (await deserializeSessionKeyAccountV2(
        publicClient,
        getEntryPoint(),
        serializedSessionKeyAccountParams,
        sessionKey
    )) as unknown as KernelSmartAccount<EntryPoint>
}

// we only use two signers for testing
export const getSignersToWeightedEcdsaKernelAccount = async (
    plugin?: KernelValidator<EntryPoint>
): Promise<KernelSmartAccount<EntryPoint>> => {
    const privateKey1 = process.env.TEST_PRIVATE_KEY as Hex
    const privateKey2 = process.env.TEST_PRIVATE_KEY2 as Hex
    if (!privateKey1 || !privateKey2) {
        throw new Error(
            "TEST_PRIVATE_KEY and TEST_PRIVATE_KEY2 environment variables must be set"
        )
    }
    const publicClient = await getPublicClient()
    const signer1 = privateKeyToAccount(privateKey1)
    const signer2 = privateKeyToAccount(privateKey2)
    const weigthedECDSAPlugin = await createWeightedECDSAValidator(
        publicClient,
        {
            entryPoint: getEntryPoint(),
            config: {
                threshold: 100,
                delay: 0,
                signers: [
                    { address: signer1.address, weight: 50 },
                    { address: signer2.address, weight: 50 }
                ]
            },
            signers: [signer1, signer2]
        }
    )

    if (plugin) {
        return await createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            plugins: {
                regular: plugin,
                sudo: weigthedECDSAPlugin
            },
            index
        })
    } else {
        return await createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            plugins: {
                sudo: weigthedECDSAPlugin
            },
            index
        })
    }
}

export const getRecoveryKernelAccount = async (
    deployedAccountAddress: Address
) => {
    const privateKey1 = generatePrivateKey()
    const signer1 = privateKeyToAccount(privateKey1)
    const recoveryPlugin = await createWeightedECDSAValidator(
        await getPublicClient(),
        {
            entryPoint: getEntryPoint(),
            config: {
                threshold: 100,
                delay: 0,
                signers: [{ address: signer1.address, weight: 100 }]
            },
            signers: [signer1]
        }
    )
    return await createKernelAccount(await getPublicClient(), {
        entryPoint: getEntryPoint(),
        deployedAccountAddress,
        plugins: {
            regular: recoveryPlugin,
            action: getRecoveryAction(getEntryPoint())
        },
        index
    })
}

export const getSignerToSessionKeyKernelAccount = async (): Promise<
    KernelSmartAccount<EntryPoint>
> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const sessionPrivateKey = generatePrivateKey()
    const sessionKey = privateKeyToAccount(sessionPrivateKey)
    const sessionKeyEmptyAccount = addressToEmptyAccount(sessionKey.address)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" }
    })

    const sessionKeyPlugin = await signerToSessionKeyValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: sessionKeyEmptyAccount,
        validatorData: {
            permissions: [
                {
                    target: Test_ERC20Address,
                    abi: TEST_ERC20Abi,
                    functionName: "transfer",
                    args: [
                        {
                            operator: ParamOperator.EQUAL,
                            value: signer.address
                        },
                        null
                    ]
                }
            ]
        }
    })

    const account = await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            regular: sessionKeyPlugin,
            sudo: ecdsaValidatorPlugin
        },
        index
    })

    const serializedSessionKeyAccountParams =
        await serializeSessionKeyAccount(account)

    return await deserializeSessionKeyAccount(
        publicClient,
        getEntryPoint(),
        serializedSessionKeyAccountParams,
        sessionKey
    )
}

export const getSignerToModularPermissionKernelAccount = async (
    policies: Policy<EntryPoint>[]
): Promise<KernelSmartAccount<EntryPoint>> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const sessionPrivateKey = generatePrivateKey()
    const sessionKey = privateKeyToAccount(sessionPrivateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" }
    })

    const ecdsaModularSigner = toECDSASigner({ signer: sessionKey })
    const modularPermissionPlugin = await createPermissionValidator(
        publicClient,
        {
            entryPoint: getEntryPoint(),
            signer: ecdsaModularSigner,
            policies
        }
    )

    return await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            regular: modularPermissionPlugin,
            sudo: ecdsaValidatorPlugin
        },
        index
    })
}

export const getSessionKeyToSessionKeyKernelAccount = async (
    sessionKeyPlugin: SessionKeyPlugin<EntryPoint>,
    action?: Action
): Promise<KernelSmartAccount<EntryPoint>> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" }
    })

    return await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            regular: sessionKeyPlugin,
            sudo: ecdsaValidatorPlugin,
            action
        },
        index
    })
}

const getBundlerRpc = (): string => {
    const zeroDevProjectId = projectId
    const zeroDevBundlerRpcHost = config["v0.6"].sepolia.bundlerUrl
    if (!zeroDevProjectId || !zeroDevBundlerRpcHost) {
        throw new Error(
            "ZERODEV_PROJECT_ID and ZERODEV_BUNDLER_RPC_HOST environment variables must be set"
        )
    }

    return `${zeroDevBundlerRpcHost}/${zeroDevProjectId}?bundlerProvider=${DEFAULT_PROVIDER}`
}

const getPaymasterRpc = (): string => {
    const zeroDevProjectId = projectId
    const zeroDevPaymasterRpcHost = process.env.ZERODEV_PAYMASTER_RPC_HOST
    if (!zeroDevProjectId || !zeroDevPaymasterRpcHost) {
        throw new Error(
            "ZERODEV_PROJECT_ID and ZERODEV_PAYMASTER_RPC_HOST environment variables must be set"
        )
    }

    return `${zeroDevPaymasterRpcHost}/${zeroDevProjectId}?paymasterProvider=${DEFAULT_PROVIDER}`
}

export const getKernelAccountClient = async <entryPoint extends EntryPoint>({
    account,
    middleware
}: Middleware<entryPoint> & {
    account?: KernelSmartAccount<entryPoint>
} = {}) => {
    const chain = getTestingChain()
    const resolvedAccount =
        account ?? (await getSignerToEcdsaKernelAccount<entryPoint>())

    return createKernelAccountClient({
        account: resolvedAccount,
        chain,
        bundlerTransport: http(getBundlerRpc()),
        middleware,
        entryPoint: getEntryPoint() as entryPoint
    }) as unknown as KernelAccountClient<
        entryPoint,
        Transport,
        Chain,
        KernelSmartAccount<entryPoint>
    >
}

export const getEoaWalletClient = (): WalletClient => {
    const rpcUrl = config["v0.6"].sepolia.rpcUrl
    if (!rpcUrl) {
        throw new Error("RPC_URL environment variable not set")
    }

    return createWalletClient({
        account: getPrivateKeyAccount(),
        chain: getTestingChain(),
        transport: http(rpcUrl)
    })
}

export const getEntryPoint = (): EntryPoint => {
    return ENTRYPOINT_ADDRESS_V06
}

export const getPublicClient = async (): Promise<PublicClient> => {
    const rpcUrl = config["v0.6"].sepolia.rpcUrl
    if (!rpcUrl) {
        throw new Error("RPC_URL environment variable not set")
    }

    const publicClient = createPublicClient({
        transport: http(rpcUrl)
    })

    const chainId = await publicClient.getChainId()
    const testingChain = getTestingChain()

    if (chainId !== testingChain.id) {
        throw new Error(
            `Testing Chain ID (${testingChain.id}) not supported by RPC URL`
        )
    }

    return publicClient
}

export const getKernelBundlerClient = (): BundlerClient<EntryPoint> => {
    const chain = getTestingChain()

    return createBundlerClient({
        chain,
        transport: http(getBundlerRpc()),
        entryPoint: getEntryPoint()
    })
}

export const getZeroDevPaymasterClient = () => {
    if (!process.env.ZERODEV_PAYMASTER_RPC_HOST)
        throw new Error(
            "ZERODEV_PAYMASTER_RPC_HOST environment variable not set"
        )
    if (!projectId)
        throw new Error("ZERODEV_PROJECT_ID environment variable not set")

    const chain = getTestingChain()

    return createZeroDevPaymasterClient({
        chain: chain,
        transport: http(getPaymasterRpc()),
        entryPoint: getEntryPoint()
    })
}

export const getZeroDevERC20PaymasterClient = () => {
    if (!process.env.ZERODEV_PAYMASTER_RPC_HOST)
        throw new Error(
            "ZERODEV_PAYMASTER_RPC_HOST environment variable not set"
        )
    if (!projectId)
        throw new Error("ZERODEV_PROJECT_ID environment variable not set")

    const chain = getTestingChain()

    return createZeroDevPaymasterClient({
        chain: chain,
        transport: http(
            // currently the ERC20 paymaster must be used with StackUp
            `${process.env.ZERODEV_PAYMASTER_RPC_HOST}/${projectId}?paymasterProvider=STACKUP`
        ),
        entryPoint: getEntryPoint()
    })
}

export const isAccountDeployed = async (
    accountAddress: Address
): Promise<boolean> => {
    const publicClient = await getPublicClient()
    const contractCode = await publicClient.getBytecode({
        address: accountAddress
    })
    return (contractCode?.length ?? 0) > 2
}

export const getDummySignature = (): Hex => {
    return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
}

export const getOldUserOpHash = (): Hex => {
    return "0xe9fad2cd67f9ca1d0b7a6513b2a42066784c8df938518da2b51bb8cc9a89ea34"
}

export const sleep = async (milliseconds: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export const waitForNonceUpdate = async (): Promise<void> => {
    return sleep(10000)
}

export const generateApproveCallData = (paymasterAddress: Address): Hex => {
    const maxUint256 = BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    )
    const approveAbi: AbiItem[] = [
        {
            inputs: [
                { name: "_spender", type: "address" },
                { name: "_value", type: "uint256" }
            ],
            name: "approve",
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function"
        }
    ]

    return encodeFunctionData({
        abi: approveAbi,
        functionName: "approve",
        args: [paymasterAddress, maxUint256]
    })
}

export const findUserOperationEvent = (logs: Log[]): boolean => {
    return logs.some((log) => {
        try {
            const event = decodeEventLog({
                abi: EntryPointAbi,
                ...log
            })
            return event.eventName === "UserOperationEvent"
        } catch {
            return false
        }
    })
}

export function createHttpServer(
    handler: RequestListener
): Promise<{ close: () => Promise<unknown>; url: string }> {
    const server = createServer(handler)

    const closeAsync = () =>
        new Promise((resolve, reject) =>
            server.close((err) => (err ? reject(err) : resolve(undefined)))
        )

    return new Promise((resolve) => {
        server.listen(() => {
            const { port } = server.address() as AddressInfo
            resolve({ close: closeAsync, url: `http://localhost:${port}` })
        })
    })
}
