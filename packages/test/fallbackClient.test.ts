// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    EIP1271Abi,
    type KernelAccountClient,
    type KernelSmartAccount,
    createFallbackKernelAccountClient,
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import dotenv from "dotenv"
import { ethers } from "ethers"
import { type BundlerClient, bundlerActions } from "permissionless"
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import {
    createPimlicoBundlerClient,
    createPimlicoPaymasterClient
} from "permissionless/clients/pimlico"
import { createStackupPaymasterClient } from "permissionless/clients/stackup"
import type { EntryPoint } from "permissionless/types/entrypoint"
import {
    http,
    type Address,
    type Chain,
    type GetContractReturnType,
    type PublicClient,
    type Transport,
    createPublicClient,
    decodeEventLog,
    encodeFunctionData,
    erc20Abi,
    getContract,
    hashMessage,
    hashTypedData,
    zeroAddress
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import { EntryPointAbi } from "./abis/EntryPoint"
import { GreeterAbi, GreeterBytecode } from "./abis/Greeter.js"
import { config } from "./config.js"
import {
    createHttpServer,
    findUserOperationEvent,
    getEntryPoint,
    getKernelBundlerClient,
    waitForNonceUpdate
} from "./utils.js"

dotenv.config()

const requiredEnvVars = [
    "RPC_URL",
    "ZERODEV_RPC_URL",
    "PIMLICO_RPC_URL",
    "STACKUP_RPC_URL",
    "ZERODEV_PAYMASTER_RPC_URL",
    "PIMLICO_PAYMASTER_RPC_URL",
    "STACKUP_PAYMASTER_RPC_URL"
]

const validateEnvironmentVariables = (envVars: string[]): void => {
    const unsetEnvVars = envVars.filter((envVar) => !process.env[envVar])
    if (unsetEnvVars.length > 0) {
        throw new Error(
            `The following environment variables are not set: ${unsetEnvVars.join(
                ", "
            )}`
        )
    }
}

validateEnvironmentVariables(requiredEnvVars)

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 132
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{130}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("fallback client e2e", () => {
    const RPC_URL = process.env.RPC_URL

    const ZERODEV_RPC_URL = process.env.ZERODEV_RPC_URL
    const PIMLICO_RPC_URL = process.env.PIMLICO_RPC_URL
    const STACKUP_RPC_URL = process.env.STACKUP_RPC_URL

    const ZERODEV_PAYMASTER_RPC_URL = process.env.ZERODEV_PAYMASTER_RPC_URL
    const PIMLICO_PAYMASTER_RPC_URL = process.env.PIMLICO_PAYMASTER_RPC_URL
    const STACKUP_PAYMASTER_RPC_URL = process.env.STACKUP_PAYMASTER_RPC_URL

    let publicClient: PublicClient
    let bundlerClient: BundlerClient<EntryPoint>
    let kernelAccount: KernelSmartAccount<EntryPoint>
    let unavailableServer: { close: () => Promise<unknown>; url: string }

    let greeterContract: GetContractReturnType<
        typeof GreeterAbi,
        KernelAccountClient<
            EntryPoint,
            Transport,
            Chain,
            KernelSmartAccount<EntryPoint>
        >,
        Address
    >

    beforeAll(async () => {
        publicClient = createPublicClient({
            transport: http(RPC_URL)
        })
        bundlerClient = getKernelBundlerClient()

        const signer = privateKeyToAccount(generatePrivateKey())
        const ecdsaValidatorPlugin = await signerToEcdsaValidator(
            publicClient,
            {
                entryPoint: getEntryPoint(),
                signer
            }
        )

        kernelAccount = await createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            plugins: {
                sudo: ecdsaValidatorPlugin
            }
        })

        unavailableServer = await createHttpServer((_req, res) => {
            res.writeHead(500)
            res.end()
        })
    })

    describe("when all clients are available", async () => {
        let fallbackKernelClient: KernelAccountClient<
            EntryPoint,
            Transport,
            Chain,
            KernelSmartAccount<EntryPoint>
        >

        beforeAll(() => {
            const zeroDevPaymasterClient = createZeroDevPaymasterClient({
                chain: sepolia,
                transport: http(ZERODEV_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const pimlicoPaymasterClient = createPimlicoPaymasterClient({
                chain: sepolia,
                transport: http(PIMLICO_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const stackupPaymasterClient = createStackupPaymasterClient({
                chain: sepolia,
                transport: http(STACKUP_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const zerodevKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(ZERODEV_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return zeroDevPaymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            const pimlicoBundlerClient = createPimlicoBundlerClient({
                transport: http(PIMLICO_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const pimlicoKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(PIMLICO_RPC_URL),
                middleware: {
                    gasPrice: async () => {
                        return (
                            await pimlicoBundlerClient.getUserOperationGasPrice()
                        ).fast
                    },
                    sponsorUserOperation: async ({ userOperation }) => {
                        return pimlicoPaymasterClient.sponsorUserOperation({
                            userOperation
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            const stackupKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(STACKUP_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return stackupPaymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint(),
                            context: {
                                type: "payg"
                            }
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            fallbackKernelClient = createFallbackKernelAccountClient([
                zerodevKernelClient,
                pimlicoKernelClient,
                stackupKernelClient
            ]) as KernelAccountClient<
                EntryPoint,
                Transport,
                Chain,
                KernelSmartAccount<EntryPoint>
            >
        })

        test("Account address should be a valid Ethereum address", async () => {
            const address = fallbackKernelClient.account.address
            expect(address).toBeString()
            expect(address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
            expect(address).toMatch(ETHEREUM_ADDRESS_REGEX)
            expect(address).not.toEqual(zeroAddress)
            console.log("account.address: ", address)
        })

        test("Account should throw when trying to sign a transaction", async () => {
            await expect(async () => {
                await fallbackKernelClient.account.signTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            }).toThrow(new SignTransactionNotSupportedBySmartAccount())
        })

        test(
            "Should validate message signatures for undeployed accounts (6492)",
            async () => {
                const message = "hello world"
                const signature =
                    await fallbackKernelClient.account.signMessage({
                        message
                    })

                expect(
                    await verifyEIP6492Signature({
                        signer: fallbackKernelClient.account.address,
                        hash: hashMessage(message),
                        signature: signature,
                        client: publicClient
                    })
                ).toBeTrue()

                // Try using Ambire as well
                const ambireResult = await verifyMessage({
                    signer: fallbackKernelClient.account.address,
                    message,
                    signature: signature,
                    provider: new ethers.providers.JsonRpcProvider(
                        config["v0.6"].sepolia.rpcUrl
                    )
                })
                expect(ambireResult).toBeTrue()
            },
            TEST_TIMEOUT
        )

        test(
            "Should validate typed data signatures for undeployed accounts (6492)",
            async () => {
                const domain = {
                    chainId: 1,
                    name: "Test",
                    verifyingContract: zeroAddress
                }

                const primaryType = "Test"

                const types = {
                    Test: [
                        {
                            name: "test",
                            type: "string"
                        }
                    ]
                }

                const message = {
                    test: "hello world"
                }
                const typedHash = hashTypedData({
                    domain,
                    primaryType,
                    types,
                    message
                })

                const signature =
                    await fallbackKernelClient.account.signTypedData({
                        domain,
                        primaryType,
                        types,
                        message
                    })

                expect(
                    await verifyEIP6492Signature({
                        signer: fallbackKernelClient.account.address,
                        hash: typedHash,
                        signature: signature,
                        client: publicClient
                    })
                ).toBeTrue()

                // Try using Ambire as well
                const ambireResult = await verifyMessage({
                    signer: fallbackKernelClient.account.address,
                    typedData: {
                        domain,
                        types,
                        message
                    },
                    signature: signature,
                    provider: new ethers.providers.JsonRpcProvider(
                        config["v0.6"].sepolia.rpcUrl
                    )
                })
                expect(ambireResult).toBeTrue()
            },
            TEST_TIMEOUT
        )

        test(
            "Client signMessage should return a valid signature",
            async () => {
                // to make sure kernel is deployed
                await fallbackKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
                const message = "hello world"
                const response = await fallbackKernelClient.signMessage({
                    message
                })
                const ambireResult = await verifyMessage({
                    signer: fallbackKernelClient.account.address,
                    message,
                    signature: response,
                    provider: new ethers.providers.JsonRpcProvider(
                        config["v0.6"].sepolia.rpcUrl
                    )
                })
                expect(ambireResult).toBeTrue()

                const eip1271response = await publicClient.readContract({
                    address: fallbackKernelClient.account.address,
                    abi: EIP1271Abi,
                    functionName: "isValidSignature",
                    args: [hashMessage(message), response]
                })
                expect(eip1271response).toEqual("0x1626ba7e")
                expect(response).toBeString()
                expect(response).toHaveLength(SIGNATURE_LENGTH)
                expect(response).toMatch(SIGNATURE_REGEX)
            },
            TEST_TIMEOUT
        )

        test(
            "Smart account client signTypedData",
            async () => {
                const domain = {
                    chainId: 1,
                    name: "Test",
                    verifyingContract: zeroAddress
                }

                const primaryType = "Test"

                const types = {
                    Test: [
                        {
                            name: "test",
                            type: "string"
                        }
                    ]
                }

                const message = {
                    test: "hello world"
                }
                const typedHash = hashTypedData({
                    domain,
                    primaryType,
                    types,
                    message
                })

                const response = await fallbackKernelClient.signTypedData({
                    domain,
                    primaryType,
                    types,
                    message
                })

                const eip1271response = await publicClient.readContract({
                    address: fallbackKernelClient.account.address,
                    abi: EIP1271Abi,
                    functionName: "isValidSignature",
                    args: [typedHash, response]
                })
                expect(eip1271response).toEqual("0x1626ba7e")
                expect(response).toBeString()
                expect(response).toHaveLength(SIGNATURE_LENGTH)
                expect(response).toMatch(SIGNATURE_REGEX)
            },
            TEST_TIMEOUT
        )

        test(
            "Client deploy contract",
            async () => {
                const response = await fallbackKernelClient.deployContract({
                    abi: GreeterAbi,
                    bytecode: GreeterBytecode
                })

                expect(response).toBeString()
                expect(response).toHaveLength(TX_HASH_LENGTH)
                expect(response).toMatch(TX_HASH_REGEX)

                const transactionReceipt =
                    await publicClient.waitForTransactionReceipt({
                        hash: response
                    })

                expect(
                    findUserOperationEvent(transactionReceipt.logs)
                ).toBeTrue()
            },
            TEST_TIMEOUT
        )

        test(
            "Smart account client send multiple transactions",
            async () => {
                greeterContract = getContract({
                    abi: GreeterAbi,
                    address: process.env.GREETER_ADDRESS as Address,
                    client: fallbackKernelClient as KernelAccountClient<
                        EntryPoint,
                        Transport,
                        Chain,
                        KernelSmartAccount<EntryPoint>
                    >
                })

                const response = await fallbackKernelClient.sendTransactions({
                    transactions: [
                        {
                            to: zeroAddress,
                            value: 0n,
                            data: "0x"
                        },
                        {
                            to: zeroAddress,
                            value: 0n,
                            data: "0x"
                        },
                        {
                            to: process.env.GREETER_ADDRESS as Address,
                            value: 0n,
                            data: encodeFunctionData({
                                abi: GreeterAbi,
                                functionName: "setGreeting",
                                args: ["hello world batched"]
                            })
                        }
                    ]
                })
                const newGreet = await greeterContract.read.greet()

                expect(newGreet).toBeString()
                expect(newGreet).toEqual("hello world batched")
                expect(response).toBeString()
                expect(response).toHaveLength(TX_HASH_LENGTH)
                expect(response).toMatch(TX_HASH_REGEX)
            },
            TEST_TIMEOUT
        )

        test(
            "Write contract",
            async () => {
                greeterContract = getContract({
                    abi: GreeterAbi,
                    address: process.env.GREETER_ADDRESS as Address,
                    client: fallbackKernelClient as KernelAccountClient<
                        EntryPoint,
                        Transport,
                        Chain,
                        KernelSmartAccount<EntryPoint>
                    >
                })

                const oldGreet = await greeterContract.read.greet()

                expect(oldGreet).toBeString()

                const txHash = await greeterContract.write.setGreeting([
                    "hello world"
                ])

                expect(txHash).toBeString()
                expect(txHash).toHaveLength(66)

                const newGreet = await greeterContract.read.greet()

                expect(newGreet).toBeString()
                expect(newGreet).toEqual("hello world")
            },
            TEST_TIMEOUT
        )

        test(
            "Client signs and then sends UserOp with paymaster",
            async () => {
                const userOp = await fallbackKernelClient.signUserOperation({
                    userOperation: {
                        callData:
                            await fallbackKernelClient.account.encodeCallData({
                                to: process.env.GREETER_ADDRESS as Address,
                                value: 0n,
                                data: encodeFunctionData({
                                    abi: GreeterAbi,
                                    functionName: "setGreeting",
                                    args: ["hello world"]
                                })
                            })
                    }
                })
                expect(userOp.signature).not.toBe("0x")

                const userOpHash = await bundlerClient.sendUserOperation({
                    userOperation: userOp
                })
                expect(userOpHash).toHaveLength(66)
                await bundlerClient.waitForUserOperationReceipt({
                    hash: userOpHash
                })

                await waitForNonceUpdate()
            },
            TEST_TIMEOUT
        )

        test(
            "Client send Transaction with paymaster",
            async () => {
                const response = await fallbackKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })

                expect(response).toBeString()
                expect(response).toHaveLength(TX_HASH_LENGTH)
                expect(response).toMatch(TX_HASH_REGEX)

                const transactionReceipt =
                    await publicClient.waitForTransactionReceipt({
                        hash: response
                    })

                expect(
                    findUserOperationEvent(transactionReceipt.logs)
                ).toBeTrue()
            },
            TEST_TIMEOUT
        )

        test(
            "Client send multiple Transactions with paymaster",
            async () => {
                const response = await fallbackKernelClient.sendTransactions({
                    transactions: [
                        {
                            to: zeroAddress,
                            value: 0n,
                            data: "0x"
                        },
                        {
                            to: zeroAddress,
                            value: 0n,
                            data: "0x"
                        }
                    ]
                })
                console.log("TransactionHash:", response)

                expect(response).toBeString()
                expect(response).toHaveLength(66)
                expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)

                const transactionReceipt =
                    await publicClient.waitForTransactionReceipt({
                        hash: response
                    })

                let eventFound = false

                for (const log of transactionReceipt.logs) {
                    // Encapsulated inside a try catch since if a log isn't wanted from this abi it will throw an error
                    try {
                        const event = decodeEventLog({
                            abi: EntryPointAbi,
                            ...log
                        })
                        if (event.eventName === "UserOperationEvent") {
                            eventFound = true
                            const userOperation =
                                await bundlerClient.getUserOperationByHash({
                                    hash: event.args.userOpHash
                                })
                            expect(
                                userOperation?.userOperation.paymasterAndData
                            ).not.toBe("0x")
                        }
                    } catch {}
                }

                expect(eventFound).toBeTrue()
            },
            TEST_TIMEOUT
        )

        test(
            "fallback client can be extended",
            async () => {
                const userOpHash = await fallbackKernelClient.sendUserOperation(
                    {
                        userOperation: {
                            callData:
                                await fallbackKernelClient.account.encodeCallData(
                                    {
                                        to: zeroAddress,
                                        value: BigInt(0),
                                        data: "0x"
                                    }
                                )
                        }
                    }
                )

                const bundlerClient = fallbackKernelClient.extend(
                    bundlerActions(getEntryPoint())
                )

                const result = await bundlerClient.waitForUserOperationReceipt({
                    hash: userOpHash
                })

                expect(result).toBeDefined();
                expect(result.success).toBe(true);
            },
            TEST_TIMEOUT
        )
    })

    describe("when zerodev paymaster client is unavailable", () => {
        let fallbackKernelClient: KernelAccountClient<
            EntryPoint,
            Transport,
            Chain,
            KernelSmartAccount<EntryPoint>
        >

        beforeAll(() => {
            const zeroDevPaymasterClient = createZeroDevPaymasterClient({
                chain: sepolia,
                transport: http(unavailableServer.url),
                entryPoint: getEntryPoint()
            })

            const pimlicoPaymasterClient = createPimlicoPaymasterClient({
                chain: sepolia,
                transport: http(PIMLICO_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const stackupPaymasterClient = createStackupPaymasterClient({
                chain: sepolia,
                transport: http(STACKUP_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const zerodevKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(ZERODEV_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return zeroDevPaymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            const pimlicoKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(PIMLICO_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return pimlicoPaymasterClient.sponsorUserOperation({
                            userOperation
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            const stackupKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(STACKUP_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return stackupPaymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint(),
                            context: {
                                type: "payg"
                            }
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            fallbackKernelClient = createFallbackKernelAccountClient([
                zerodevKernelClient,
                pimlicoKernelClient,
                stackupKernelClient
            ]) as KernelAccountClient<
                EntryPoint,
                Transport,
                Chain,
                KernelSmartAccount<EntryPoint>
            >
        })

        test(
            "can send transaction",
            async () => {
                const response = await fallbackKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })

                expect(response).toBeString()
                expect(response).toHaveLength(TX_HASH_LENGTH)
                expect(response).toMatch(TX_HASH_REGEX)

                const transactionReceipt =
                    await publicClient.waitForTransactionReceipt({
                        hash: response
                    })

                expect(
                    findUserOperationEvent(transactionReceipt.logs)
                ).toBeTrue()
            },
            TEST_TIMEOUT
        )
    })

    describe("when zerodev bundler client is unavailable", () => {
        let fallbackKernelClient: KernelAccountClient<
            EntryPoint,
            Transport,
            Chain,
            KernelSmartAccount<EntryPoint>
        >

        beforeAll(() => {
            const zeroDevPaymasterClient = createZeroDevPaymasterClient({
                chain: sepolia,
                transport: http(ZERODEV_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const pimlicoPaymasterClient = createPimlicoPaymasterClient({
                chain: sepolia,
                transport: http(PIMLICO_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const stackupPaymasterClient = createStackupPaymasterClient({
                chain: sepolia,
                transport: http(STACKUP_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const zerodevKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(unavailableServer.url),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return zeroDevPaymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            const pimlicoBundlerClient = createPimlicoBundlerClient({
                transport: http(PIMLICO_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const pimlicoKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(PIMLICO_RPC_URL),
                middleware: {
                    gasPrice: async () => {
                        return (
                            await pimlicoBundlerClient.getUserOperationGasPrice()
                        ).fast
                    },
                    sponsorUserOperation: async ({ userOperation }) => {
                        return pimlicoPaymasterClient.sponsorUserOperation({
                            userOperation
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            const stackupKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(STACKUP_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return stackupPaymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint(),
                            context: {
                                type: "payg"
                            }
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            fallbackKernelClient = createFallbackKernelAccountClient([
                zerodevKernelClient,
                pimlicoKernelClient,
                stackupKernelClient
            ]) as KernelAccountClient<
                EntryPoint,
                Transport,
                Chain,
                KernelSmartAccount<EntryPoint>
            >
        })

        test(
            "can send transaction",
            async () => {
                const response = await fallbackKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })

                expect(response).toBeString()
                expect(response).toHaveLength(TX_HASH_LENGTH)
                expect(response).toMatch(TX_HASH_REGEX)

                const transactionReceipt =
                    await publicClient.waitForTransactionReceipt({
                        hash: response
                    })

                expect(
                    findUserOperationEvent(transactionReceipt.logs)
                ).toBeTrue()
            },
            TEST_TIMEOUT
        )
    })

    describe("when zerodev client and pimlico client is unavailable", () => {
        let fallbackKernelClient: KernelAccountClient<
            EntryPoint,
            Transport,
            Chain,
            KernelSmartAccount<EntryPoint>
        >

        beforeAll(() => {
            const zeroDevPaymasterClient = createZeroDevPaymasterClient({
                chain: sepolia,
                transport: http(unavailableServer.url),
                entryPoint: getEntryPoint()
            })

            const pimlicoPaymasterClient = createPimlicoPaymasterClient({
                chain: sepolia,
                transport: http(PIMLICO_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const stackupPaymasterClient = createStackupPaymasterClient({
                chain: sepolia,
                transport: http(STACKUP_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const zerodevKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(ZERODEV_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return zeroDevPaymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            const pimlicoBundlerClient = createPimlicoBundlerClient({
                transport: http(PIMLICO_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const pimlicoKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(unavailableServer.url),
                middleware: {
                    gasPrice: async () => {
                        return (
                            await pimlicoBundlerClient.getUserOperationGasPrice()
                        ).fast
                    },
                    sponsorUserOperation: async ({ userOperation }) => {
                        return pimlicoPaymasterClient.sponsorUserOperation({
                            userOperation
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            const stackupKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(STACKUP_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return stackupPaymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint(),
                            context: {
                                type: "payg"
                            }
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            fallbackKernelClient = createFallbackKernelAccountClient([
                zerodevKernelClient,
                pimlicoKernelClient,
                stackupKernelClient
            ]) as KernelAccountClient<
                EntryPoint,
                Transport,
                Chain,
                KernelSmartAccount<EntryPoint>
            >
        })

        test(
            "can send transaction",
            async () => {
                const response = await fallbackKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })

                expect(response).toBeString()
                expect(response).toHaveLength(TX_HASH_LENGTH)
                expect(response).toMatch(TX_HASH_REGEX)

                const transactionReceipt =
                    await publicClient.waitForTransactionReceipt({
                        hash: response
                    })

                expect(
                    findUserOperationEvent(transactionReceipt.logs)
                ).toBeTrue()
            },
            TEST_TIMEOUT
        )
    })

    describe("when all clients is unavailable", () => {
        let fallbackKernelClient: KernelAccountClient<
            EntryPoint,
            Transport,
            Chain,
            KernelSmartAccount<EntryPoint>
        >

        beforeAll(() => {
            const zeroDevPaymasterClient = createZeroDevPaymasterClient({
                chain: sepolia,
                transport: http(unavailableServer.url),
                entryPoint: getEntryPoint()
            })

            const pimlicoPaymasterClient = createPimlicoPaymasterClient({
                chain: sepolia,
                transport: http(unavailableServer.url),
                entryPoint: getEntryPoint()
            })

            const stackupPaymasterClient = createStackupPaymasterClient({
                chain: sepolia,
                transport: http(unavailableServer.url),
                entryPoint: getEntryPoint()
            })

            const zerodevKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(unavailableServer.url),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return zeroDevPaymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            const pimlicoBundlerClient = createPimlicoBundlerClient({
                transport: http(unavailableServer.url),
                entryPoint: getEntryPoint()
            })

            const pimlicoKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(unavailableServer.url),
                middleware: {
                    gasPrice: async () => {
                        return (
                            await pimlicoBundlerClient.getUserOperationGasPrice()
                        ).fast
                    },
                    sponsorUserOperation: async ({ userOperation }) => {
                        return pimlicoPaymasterClient.sponsorUserOperation({
                            userOperation
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            const stackupKernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: http(unavailableServer.url),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return stackupPaymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint(),
                            context: {
                                type: "payg"
                            }
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            fallbackKernelClient = createFallbackKernelAccountClient([
                zerodevKernelClient,
                pimlicoKernelClient,
                stackupKernelClient
            ]) as KernelAccountClient<
                EntryPoint,
                Transport,
                Chain,
                KernelSmartAccount<EntryPoint>
            >
        })

        test(
            "should throw error",
            async () => {
                await expect(
                    fallbackKernelClient.sendTransaction({
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    })
                ).rejects.toThrow()
            },
            TEST_TIMEOUT
        )
    })
})
