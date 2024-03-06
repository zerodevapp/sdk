import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { createPasskeyValidator } from "@zerodev/passkey-validator"
import {
    KernelAccountClient,
    KernelSmartAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { KernelValidator, createKernelV1Account } from "@zerodev/sdk"
import {
    addressToEmptyAccount,
    createKernelAccount
} from "@zerodev/sdk/accounts"
import type { ExecutorData } from "@zerodev/sdk/types"
import {
    ParamOperator,
    SessionKeyPlugin,
    deserializeSessionKeyAccount,
    serializeSessionKeyAccount,
    signerToSessionKeyValidator
} from "@zerodev/session-key"
import { createWeightedECDSAValidator } from "@zerodev/weighted-ecdsa-validator"
import { BundlerClient, createBundlerClient } from "permissionless"
import {
    type SmartAccount,
    signerToSimpleSmartAccount
} from "permissionless/accounts"
import { SponsorUserOperationMiddleware } from "permissionless/actions/smartAccount"
import {
    http,
    AbiItem,
    Address,
    Hex,
    type Log,
    type PublicClient,
    Transport,
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
import { type Chain, goerli } from "viem/chains"
import * as allChains from "viem/chains"
import { Policy } from "../../plugins/modularPermission/policies/types.js"
import { toECDSASigner } from "../../plugins/modularPermission/signers/toECDSASigner.js"
import { createPermissionValidator } from "../../plugins/modularPermission/toModularPermissionValidatorPlugin.js"
import { EntryPointAbi } from "./abis/EntryPoint.js"
import { TEST_ERC20Abi } from "./abis/Test_ERC20Abi.js"

export const Test_ERC20Address = "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"
export const index = 0n
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
    const testChainId = process.env.TEST_CHAIN_ID
    const chainId = testChainId ? parseInt(testChainId, 10) : goerli.id
    const chain = Object.values(allChains).find((c) => c.id === chainId)
    if (!chain) {
        throw new Error(`Chain with id ${chainId} not found`)
    }
    return chain
}

export const getSignerToSimpleSmartAccount =
    async (): Promise<SmartAccount> => {
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

export const getSignerToEcdsaKernelAccount =
    async (): Promise<SmartAccount> => {
        const privateKey = process.env.TEST_PRIVATE_KEY as Hex
        if (!privateKey) {
            throw new Error("TEST_PRIVATE_KEY environment variable not set")
        }

        return getEcdsaKernelAccountWithPrivateKey(privateKey)
    }

export const getEcdsaKernelAccountWithRandomSigner =
    async (): Promise<SmartAccount> => {
        return getEcdsaKernelAccountWithPrivateKey(generatePrivateKey())
    }

const getEcdsaKernelAccountWithPrivateKey = async (
    privateKey: Hex
): Promise<SmartAccount> => {
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
    })
}

export const getKernelV1Account = async (): Promise<SmartAccount> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)

    return createKernelV1Account(publicClient, {
        signer,
        index
    })
}

// we only use two signers for testing
export const getSignersToWeightedEcdsaKernelAccount = async (
    plugin?: KernelValidator
): Promise<SmartAccount> => {
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

export const getSignerToWebAuthnKernelAccount =
    async (): Promise<SmartAccount> => {
        const publicClient = await getPublicClient()
        const webAuthnValidatorPlugin = await createPasskeyValidator(
            publicClient,
            {
                entryPoint: getEntryPoint()
            }
        )

        return createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            plugins: {
                sudo: webAuthnValidatorPlugin
            },
            index
        })
    }

export const getSignerToSessionKeyKernelAccount =
    async (): Promise<SmartAccount> => {
        const privateKey = process.env.TEST_PRIVATE_KEY as Hex
        if (!privateKey) {
            throw new Error("TEST_PRIVATE_KEY environment variable not set")
        }

        const publicClient = await getPublicClient()
        const signer = privateKeyToAccount(privateKey)
        const sessionPrivateKey = generatePrivateKey()
        const sessionKey = privateKeyToAccount(sessionPrivateKey)
        const sessionKeyEmptyAccount = addressToEmptyAccount(sessionKey.address)
        const ecdsaValidatorPlugin = await signerToEcdsaValidator(
            publicClient,
            {
                entryPoint: getEntryPoint(),
                signer: { ...signer, source: "local" as "local" | "external" }
            }
        )

        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
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
            }
        )

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
            serializedSessionKeyAccountParams,
            sessionKey
        )
    }

export const getSignerToModularPermissionKernelAccount = async (
    policies: Policy[]
): Promise<SmartAccount> => {
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

export const getSessionKeyToSessionKeyKernelAccount = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    sessionKeyPlugin: SessionKeyPlugin,
    executorData?: ExecutorData
): Promise<KernelSmartAccount> => {
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
            executorData
        },
        index
    })
}

const DEFAULT_PROVIDER = "PIMLICO"

const getBundlerRpc = (): string => {
    const zeroDevProjectId = process.env.ZERODEV_PROJECT_ID
    const zeroDevBundlerRpcHost = process.env.ZERODEV_BUNDLER_RPC_HOST
    if (!zeroDevProjectId || !zeroDevBundlerRpcHost) {
        throw new Error(
            "ZERODEV_PROJECT_ID and ZERODEV_BUNDLER_RPC_HOST environment variables must be set"
        )
    }

    return `${zeroDevBundlerRpcHost}/${zeroDevProjectId}?bundlerProvider=${DEFAULT_PROVIDER}`
}

const getPaymasterRpc = (): string => {
    const zeroDevProjectId = process.env.ZERODEV_PROJECT_ID
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
    sponsorUserOperation
}: SponsorUserOperationMiddleware & {
    account?: SmartAccount
} = {}) => {
    const chain = getTestingChain()
    const resolvedAccount = account ?? (await getSignerToSimpleSmartAccount())

    return createKernelAccountClient({
        account: resolvedAccount,
        chain,
        transport: http(getBundlerRpc()),
        sponsorUserOperation
    }) as KernelAccountClient<Transport, Chain, KernelSmartAccount>
}

export const getEoaWalletClient = (): WalletClient => {
    const rpcUrl = process.env.RPC_URL
    if (!rpcUrl) {
        throw new Error("RPC_URL environment variable not set")
    }

    return createWalletClient({
        account: getPrivateKeyAccount(),
        chain: getTestingChain(),
        transport: http(rpcUrl)
    })
}

export const getEntryPoint = (): Address => {
    const entryPointAddress = process.env.ENTRYPOINT_ADDRESS as Address
    if (!entryPointAddress) {
        throw new Error("ENTRYPOINT_ADDRESS environment variable not set")
    }
    return entryPointAddress
}

export const getPublicClient = async (): Promise<PublicClient> => {
    const rpcUrl = process.env.RPC_URL
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

export const getKernelBundlerClient = (): BundlerClient => {
    const chain = getTestingChain()

    return createBundlerClient({
        chain,
        transport: http(getBundlerRpc())
    })
}

export const getZeroDevPaymasterClient = () => {
    if (!process.env.ZERODEV_PAYMASTER_RPC_HOST)
        throw new Error(
            "ZERODEV_PAYMASTER_RPC_HOST environment variable not set"
        )
    if (!process.env.ZERODEV_PROJECT_ID)
        throw new Error("ZERODEV_PROJECT_ID environment variable not set")

    const chain = getTestingChain()

    return createZeroDevPaymasterClient({
        chain: chain,
        transport: http(getPaymasterRpc())
    })
}

export const getZeroDevERC20PaymasterClient = () => {
    if (!process.env.ZERODEV_PAYMASTER_RPC_HOST)
        throw new Error(
            "ZERODEV_PAYMASTER_RPC_HOST environment variable not set"
        )
    if (!process.env.ZERODEV_PROJECT_ID)
        throw new Error("ZERODEV_PROJECT_ID environment variable not set")

    const chain = getTestingChain()

    return createZeroDevPaymasterClient({
        chain: chain,
        transport: http(
            // currently the ERC20 paymaster must be used with StackUp
            `${process.env.ZERODEV_PAYMASTER_RPC_HOST}/${process.env.ZERODEV_PROJECT_ID}?paymasterProvider=STACKUP`
        )
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
