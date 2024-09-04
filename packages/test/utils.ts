import { type RequestListener, createServer } from "http"
import type { AddressInfo } from "net"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    type KernelAccountClient,
    type KernelSmartAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { type KernelValidator, createKernelAccountV1 } from "@zerodev/sdk"
import {
    addressToEmptyAccount,
    createKernelAccount
} from "@zerodev/sdk/accounts"
import { createKernelAccountV0_2 } from "@zerodev/sdk/accounts"
import type { Action } from "@zerodev/sdk/types"
import {
    ParamOperator,
    type SessionKeyPlugin,
    deserializeSessionKeyAccount,
    deserializeSessionKeyAccountV0_2,
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
import type { Middleware } from "permissionless/actions/smartAccount"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint
} from "permissionless/types"
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
const projectId = config["v0.6"][sepolia.id].projectId
export const kernelVersion = "0.2.4"
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
    const testChainId = config["v0.6"][sepolia.id].chainId
    const chainId = testChainId ?? sepolia.id
    const chain = Object.values(allChains).find((c) => c.id === chainId)
    if (!chain) {
        throw new Error(`Chain with id ${chainId} not found`)
    }
    return chain
}

export const getSignerToEcdsaKernelAccount = async <
    entryPoint extends EntryPoint
>(): Promise<
    KernelSmartAccount<
        ENTRYPOINT_ADDRESS_V06_TYPE,
        Transport,
        Chain | undefined
    >
> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    return getEcdsaKernelAccountWithPrivateKey(privateKey)
}

export const getEcdsaKernelAccountWithRandomSigner = async () => {
    return getEcdsaKernelAccountWithPrivateKey(generatePrivateKey())
}

export const getEcdsaKernelAccountWithPrivateKey = async <
    entryPoint extends EntryPoint
>(
    privateKey: Hex
) => {
    if (!privateKey) {
        throw new Error("privateKey cannot be empty")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" },
        kernelVersion
    })

    return createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaValidatorPlugin
        },
        index,
        kernelVersion
    })
}

export const getKernelV1Account = async () => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)

    return createKernelAccountV1(publicClient, {
        signer,
        index,
        entryPoint: getEntryPoint()
    }) as unknown as KernelSmartAccount<ENTRYPOINT_ADDRESS_V06_TYPE>
}

export const getSignerToEcdsaKernelV2Account = async () => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        signer,
        validatorAddress: "0x417f5a41305ddc99d18b5e176521b468b2a31b86",
        entryPoint: getEntryPoint(),
        kernelVersion: "0.0.2"
    })

    return createKernelAccountV0_2(publicClient, {
        entryPoint: ENTRYPOINT_ADDRESS_V06,
        plugins: {
            sudo: ecdsaValidatorPlugin
        },
        index
    })
}

export const getSignerToSessionKeyKernelV2Account = async () => {
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
        validatorAddress: "0x417f5a41305ddc99d18b5e176521b468b2a31b86",
        kernelVersion: "0.0.2"
    })

    const sessionKeyPlugin = await signerToSessionKeyValidator(publicClient, {
        signer: sessionKeyEmptyAccount,
        entryPoint: getEntryPoint(),
        kernelVersion,
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

    const account = await createKernelAccountV0_2(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            regular: sessionKeyPlugin,
            sudo: ecdsaValidatorPlugin
        },
        index
    })

    const serializedSessionKeyAccountParams =
        await serializeSessionKeyAccount(account)

    return await deserializeSessionKeyAccountV0_2(
        publicClient,
        getEntryPoint(),
        serializedSessionKeyAccountParams,
        sessionKey
    )
}

// we only use two signers for testing
export const getSignersToWeightedEcdsaKernelAccount = async (
    plugin?: KernelValidator<ENTRYPOINT_ADDRESS_V06_TYPE>
): Promise<KernelSmartAccount<ENTRYPOINT_ADDRESS_V06_TYPE>> => {
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
            kernelVersion,
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
            index,
            kernelVersion
        })
    } else {
        return await createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            plugins: {
                sudo: weigthedECDSAPlugin
            },
            index,
            kernelVersion
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
            kernelVersion,
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
        index,
        kernelVersion
    })
}

export const getSignerToSessionKeyKernelAccount = async (): Promise<
    KernelSmartAccount<ENTRYPOINT_ADDRESS_V06_TYPE>
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
        kernelVersion
    })

    const sessionKeyPlugin = await signerToSessionKeyValidator(publicClient, {
        entryPoint: getEntryPoint(),
        kernelVersion,
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
        index,
        kernelVersion
    })

    const serializedSessionKeyAccountParams =
        await serializeSessionKeyAccount(account)

    return await deserializeSessionKeyAccount(
        publicClient,
        getEntryPoint(),
        kernelVersion,
        serializedSessionKeyAccountParams,
        sessionKey
    )
}

export const getSignerToModularPermissionKernelAccount = async (
    policies: Policy<EntryPoint>[]
): Promise<KernelSmartAccount<ENTRYPOINT_ADDRESS_V06_TYPE>> => {
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
        signer: { ...signer, source: "local" as "local" | "external" },
        kernelVersion
    })

    const ecdsaModularSigner = toECDSASigner({ signer: sessionKey })
    const modularPermissionPlugin = await createPermissionValidator(
        publicClient,
        {
            entryPoint: getEntryPoint(),
            kernelVersion,
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
        index,
        kernelVersion
    })
}

export const getSessionKeyToSessionKeyKernelAccount = async (
    sessionKeyPlugin: SessionKeyPlugin<ENTRYPOINT_ADDRESS_V06_TYPE>,
    action?: Action
): Promise<KernelSmartAccount<ENTRYPOINT_ADDRESS_V06_TYPE>> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" },
        kernelVersion
    })

    return await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            regular: sessionKeyPlugin,
            sudo: ecdsaValidatorPlugin,
            action
        },
        index,
        kernelVersion
    })
}

const getBundlerRpc = (): string => {
    const zeroDevProjectId = projectId
    const zeroDevBundlerRpcHost = config["v0.6"][sepolia.id].bundlerUrl
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

export const getKernelAccountClient = async ({
    account,
    middleware
}: Middleware<ENTRYPOINT_ADDRESS_V06_TYPE> & {
    account?: KernelSmartAccount<
        ENTRYPOINT_ADDRESS_V06_TYPE,
        Transport,
        Chain | undefined
    >
} = {}): Promise<
    KernelAccountClient<
        ENTRYPOINT_ADDRESS_V06_TYPE,
        Transport,
        Chain,
        KernelSmartAccount<ENTRYPOINT_ADDRESS_V06_TYPE>
    >
> => {
    const chain = getTestingChain()
    const resolvedAccount = account ?? (await getSignerToEcdsaKernelAccount())

    return createKernelAccountClient({
        entryPoint: getEntryPoint(),
        account: resolvedAccount,
        chain,
        bundlerTransport: http(getBundlerRpc()),
        middleware
    })
}

export const getEoaWalletClient = (): WalletClient => {
    const rpcUrl = config["v0.6"][sepolia.id].rpcUrl
    if (!rpcUrl) {
        throw new Error("RPC_URL environment variable not set")
    }

    return createWalletClient({
        account: getPrivateKeyAccount(),
        chain: getTestingChain(),
        transport: http(rpcUrl)
    })
}

export const getEntryPoint = (): ENTRYPOINT_ADDRESS_V06_TYPE => {
    return ENTRYPOINT_ADDRESS_V06
}

export const getPublicClient = async (): Promise<PublicClient> => {
    const rpcUrl = config["v0.6"][sepolia.id].rpcUrl
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

export const getKernelBundlerClient = () => {
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
