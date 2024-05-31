// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import {
    EIP1271Abi,
    type KernelAccountClient,
    type KernelSmartAccount,
    type KernelValidator,
    type ZeroDevPaymasterClient,
    addressToEmptyAccount,
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
    getCustomNonceKeyFromString,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import { ethers } from "ethers"
import {
    type BundlerClient,
    ENTRYPOINT_ADDRESS_V07,
    bundlerActions,
    deepHexlify
} from "permissionless"
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import type {
    ENTRYPOINT_ADDRESS_V07_TYPE,
    EntryPoint
} from "permissionless/types/entrypoint"
import {
    http,
    type Address,
    type Chain,
    type GetContractReturnType,
    type Hex,
    type PrivateKeyAccount,
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
import { optimismSepolia, sepolia } from "viem/chains"
import { ecdsaPrepareMultiUserOpRequest } from "../../../plugins/multichain/ecdsa/ecdsaPrepareMultiUserOpRequest.js"
import { ecdsaSignUserOps } from "../../../plugins/multichain/ecdsa/ecdsaSignUserOps.js"
import { ecdsaSignUserOpsWithEnable } from "../../../plugins/multichain/ecdsa/ecdsaSignUserOpsWithEnable.js"
import { toMultiChainECDSAValidator } from "../../../plugins/multichain/ecdsa/toMultiChainECDSAValidator.js"
import { deserializePermissionAccount } from "../../../plugins/permission/deserializePermissionAccount.js"
import { toSudoPolicy } from "../../../plugins/permission/policies/index.js"
import { serializeMultiChainPermissionAccounts } from "../../../plugins/permission/serializeMultiChainPermissionAccounts.js"
import { toECDSASigner } from "../../../plugins/permission/signers/index.js"
import { toPermissionValidator } from "../../../plugins/permission/toPermissionValidator.js"
import { EntryPointAbi } from "../abis/EntryPoint.js"
import { GreeterAbi, GreeterBytecode } from "../abis/Greeter.js"
import { TokenActionsAbi } from "../abis/TokenActionsAbi.js"
import { TOKEN_ACTION_ADDRESS, config } from "../config.js"
import { Test_ERC20Address } from "../utils.js"
import {
    findUserOperationEvent,
    getEntryPoint,
    kernelVersion,
    mintToAccount,
    validateEnvironmentVariables,
    waitForNonceUpdate
} from "./utils.js"

const requiredEnvVars = [
    "TEST_PRIVATE_KEY",
    "GREETER_ADDRESS",
    "SEPOLIA_RPC_URL",
    "OPTIMISM_SEPOLIA_RPC_URL",
    "SEPOLIA_ZERODEV_RPC_URL",
    "SEPOLIA_ZERODEV_PAYMASTER_RPC_URL",
    "OPTIMISM_SEPOLIA_ZERODEV_RPC_URL",
    "OPTIMISM_SEPOLIA_ZERODEV_PAYMASTER_RPC_URL"
]

validateEnvironmentVariables(requiredEnvVars)

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const OPTIMISM_SEPOLIA_RPC_URL = process.env.OPTIMISM_SEPOLIA_RPC_URL

const SEPOLIA_ZERODEV_RPC_URL = process.env.SEPOLIA_ZERODEV_RPC_URL
const SEPOLIA_ZERODEV_PAYMASTER_RPC_URL =
    process.env.SEPOLIA_ZERODEV_PAYMASTER_RPC_URL

const OPTIMISM_SEPOLIA_ZERODEV_RPC_URL =
    process.env.OPTIMISM_SEPOLIA_ZERODEV_RPC_URL
const OPTIMISM_SEPOLIA_ZERODEV_PAYMASTER_RPC_URL =
    process.env.OPTIMISM_SEPOLIA_ZERODEV_PAYMASTER_RPC_URL

const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY

describe("MultiChainECDSAValidator", () => {
    let sepoliaPublicClient: PublicClient
    let optimismSepoliaPublicClient: PublicClient

    let sepoliaZeroDevPaymasterClient: ZeroDevPaymasterClient<ENTRYPOINT_ADDRESS_V07_TYPE>
    let opSepoliaZeroDevPaymasterClient: ZeroDevPaymasterClient<ENTRYPOINT_ADDRESS_V07_TYPE>

    let signer: PrivateKeyAccount
    let sepoliaMultiChainECDSAValidatorPlugin: KernelValidator<
        ENTRYPOINT_ADDRESS_V07_TYPE,
        string
    >
    let optimismsepoliaMultiChainECDSAValidatorPlugin: KernelValidator<
        ENTRYPOINT_ADDRESS_V07_TYPE,
        string
    >

    let account: KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    let kernelClient: KernelAccountClient<
        ENTRYPOINT_ADDRESS_V07_TYPE,
        Transport,
        Chain,
        KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    >
    let bundlerClient: BundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE>
    let greeterContract: GetContractReturnType<
        typeof GreeterAbi,
        typeof kernelClient,
        Address
    >
    let owner: Address

    beforeAll(async () => {
        sepoliaPublicClient = createPublicClient({
            transport: http(SEPOLIA_RPC_URL)
        })
        optimismSepoliaPublicClient = createPublicClient({
            transport: http(OPTIMISM_SEPOLIA_RPC_URL)
        })

        sepoliaZeroDevPaymasterClient = createZeroDevPaymasterClient({
            chain: sepolia,
            transport: http(SEPOLIA_ZERODEV_PAYMASTER_RPC_URL),
            entryPoint: getEntryPoint()
        })

        opSepoliaZeroDevPaymasterClient = createZeroDevPaymasterClient({
            chain: optimismSepolia,
            transport: http(OPTIMISM_SEPOLIA_ZERODEV_PAYMASTER_RPC_URL),
            entryPoint: getEntryPoint()
        })

        signer = privateKeyToAccount(PRIVATE_KEY as Hex)

        sepoliaMultiChainECDSAValidatorPlugin =
            await toMultiChainECDSAValidator(sepoliaPublicClient, {
                entryPoint: getEntryPoint(),
                kernelVersion,
                signer
            })
        optimismsepoliaMultiChainECDSAValidatorPlugin =
            await toMultiChainECDSAValidator(optimismSepoliaPublicClient, {
                entryPoint: getEntryPoint(),
                kernelVersion,
                signer
            })

        account = await createKernelAccount(sepoliaPublicClient, {
            entryPoint: getEntryPoint(),
            kernelVersion,
            plugins: {
                sudo: sepoliaMultiChainECDSAValidatorPlugin
            }
        })

        kernelClient = createKernelAccountClient({
            account: account,
            chain: sepolia,
            bundlerTransport: http(SEPOLIA_ZERODEV_RPC_URL),
            middleware: {
                sponsorUserOperation: async ({ userOperation }) => {
                    return sepoliaZeroDevPaymasterClient.sponsorUserOperation({
                        userOperation,
                        entryPoint: getEntryPoint()
                    })
                }
            },
            entryPoint: getEntryPoint()
        })
        bundlerClient = kernelClient.extend(bundlerActions(getEntryPoint()))

        greeterContract = getContract({
            abi: GreeterAbi,
            address: process.env.GREETER_ADDRESS as Address,
            client: kernelClient
        })
        owner = privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex).address
    })

    test("Account address should be a valid Ethereum address", async () => {
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(account.address).not.toEqual(zeroAddress)
        console.log("account.address: ", account.address)
    })

    test("Account should throw when trying to sign a transaction", async () => {
        await expect(async () => {
            await account.signTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
        }).toThrow(new SignTransactionNotSupportedBySmartAccount())
    })

    test(
        "Should validate message signatures for undeployed accounts (6492)",
        async () => {
            const multiChainECDSAValidatorPluginWithRandomSigner =
                await toMultiChainECDSAValidator(sepoliaPublicClient, {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    signer: privateKeyToAccount(generatePrivateKey())
                })
            const account = await createKernelAccount(sepoliaPublicClient, {
                entryPoint: getEntryPoint(),
                kernelVersion,
                plugins: {
                    sudo: multiChainECDSAValidatorPluginWithRandomSigner
                }
            })
            const message = "hello world"
            const signature = await account.signMessage({
                message
            })

            expect(
                await verifyEIP6492Signature({
                    signer: account.address,
                    hash: hashMessage(message),
                    signature: signature,
                    client: sepoliaPublicClient
                })
            ).toBeTrue()

            // Try using Ambire as well
            const ambireResult = await verifyMessage({
                signer: account.address,
                message,
                signature: signature,
                provider: new ethers.providers.JsonRpcProvider(
                    config["v0.7"].sepolia.rpcUrl
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

            const multiChainValidatorPluginWithRandomSigner =
                await toMultiChainECDSAValidator(sepoliaPublicClient, {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    signer: privateKeyToAccount(generatePrivateKey())
                })
            const account = await createKernelAccount(sepoliaPublicClient, {
                entryPoint: getEntryPoint(),
                kernelVersion,
                plugins: {
                    sudo: multiChainValidatorPluginWithRandomSigner
                }
            })
            const signature = await account.signTypedData({
                domain,
                primaryType,
                types,
                message
            })

            expect(
                await verifyEIP6492Signature({
                    signer: account.address,
                    hash: typedHash,
                    signature: signature,
                    client: sepoliaPublicClient
                })
            ).toBeTrue()

            // Try using Ambire as well
            const ambireResult = await verifyMessage({
                signer: account.address,
                typedData: {
                    domain,
                    types,
                    message
                },
                signature: signature,
                provider: new ethers.providers.JsonRpcProvider(
                    config["v0.7"].sepolia.rpcUrl
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
            const tx = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log("tx", tx)

            const message = "hello world"
            const response = await kernelClient.signMessage({
                message
            })
            console.log("hashMessage(message)", hashMessage(message))
            console.log("response", response)
            const ambireResult = await verifyMessage({
                signer: account.address,
                message,
                signature: response,
                provider: new ethers.providers.JsonRpcProvider(
                    config["v0.7"].sepolia.rpcUrl
                )
            })
            expect(ambireResult).toBeTrue()

            const eip1271response = await sepoliaPublicClient.readContract({
                address: account.address,
                abi: EIP1271Abi,
                functionName: "isValidSignature",
                args: [hashMessage(message), response]
            })
            console.log("eip1271response", eip1271response)
            console.log("response", response)
            expect(eip1271response).toEqual("0x1626ba7e")
            expect(response).toBeString()
            expect(response).toHaveLength(SIGNATURE_LENGTH)
            expect(response).toMatch(SIGNATURE_REGEX)
        },
        TEST_TIMEOUT
    )

    test(
        "Client signMessage should return a valid signature",
        async () => {
            // to make sure kernel is deployed
            const tx = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log("tx", tx)

            const message = "hello world"
            const response = await kernelClient.signMessage({
                message
            })
            console.log("hashMessage(message)", hashMessage(message))
            console.log("response", response)
            const ambireResult = await verifyMessage({
                signer: account.address,
                message,
                signature: response,
                provider: new ethers.providers.JsonRpcProvider(
                    config["v0.7"].sepolia.rpcUrl
                )
            })
            expect(ambireResult).toBeTrue()

            const eip1271response = await sepoliaPublicClient.readContract({
                address: account.address,
                abi: EIP1271Abi,
                functionName: "isValidSignature",
                args: [hashMessage(message), response]
            })
            console.log("eip1271response", eip1271response)
            console.log("response", response)
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

            const response = await kernelClient.signTypedData({
                domain,
                primaryType,
                types,
                message
            })

            const eip1271response = await sepoliaPublicClient.readContract({
                address: account.address,
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
            const response = await kernelClient.sendUserOperation({
                userOperation: {
                    callData: await kernelClient.account.encodeDeployCallData({
                        abi: GreeterAbi,
                        bytecode: GreeterBytecode
                    })
                }
            })

            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)

            const rcpt = await bundlerClient.waitForUserOperationReceipt({
                hash: response
            })
            const transactionReceipt =
                await sepoliaPublicClient.waitForTransactionReceipt({
                    hash: rcpt.receipt.transactionHash
                })

            expect(findUserOperationEvent(transactionReceipt.logs)).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send multiple transactions",
        async () => {
            const response = await kernelClient.sendTransactions({
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
            const userOp = await kernelClient.signUserOperation({
                userOperation: {
                    callData: await kernelClient.account.encodeCallData([
                        {
                            to: process.env.GREETER_ADDRESS as Address,
                            value: 0n,
                            data: encodeFunctionData({
                                abi: GreeterAbi,
                                functionName: "setGreeting",
                                args: ["hello world"]
                            })
                        },
                        {
                            to: process.env.GREETER_ADDRESS as Address,
                            value: 0n,
                            data: encodeFunctionData({
                                abi: GreeterAbi,
                                functionName: "setGreeting",
                                args: ["hello world 2"]
                            })
                        }
                    ])
                }
            })
            expect(userOp.signature).not.toBe("0x")

            const userOpHash = await kernelClient.sendUserOperation({
                userOperation: userOp
            })
            expect(userOpHash).toHaveLength(66)
            await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash
            })

            await waitForNonceUpdate()

            const greet = await greeterContract.read.greet()
            expect(greet).toBeString()
            expect(greet).toEqual("hello world 2")
        },
        TEST_TIMEOUT
    )

    test(
        "Client send UserOp with delegatecall",
        async () => {
            const accountAddress = kernelClient.account.address
            const amountToMint = 10000000n
            const amountToTransfer = 4337n
            await mintToAccount(
                sepoliaPublicClient,
                kernelClient,
                accountAddress,
                amountToMint
            )
            const userOpHash = await kernelClient.sendUserOperation({
                userOperation: {
                    callData: await kernelClient.account.encodeCallData({
                        to: TOKEN_ACTION_ADDRESS,
                        value: 0n,
                        data: encodeFunctionData({
                            abi: TokenActionsAbi,
                            functionName: "transferERC20Action",
                            args: [Test_ERC20Address, amountToTransfer, owner]
                        }),
                        callType: "delegatecall"
                    })
                }
            })
            const transaction = await bundlerClient.waitForUserOperationReceipt(
                {
                    hash: userOpHash
                }
            )
            console.log(
                "transferTransactionHash",
                `https://sepolia.etherscan.io/tx/${transaction.receipt.transactionHash}`
            )
            const transactionReceipt =
                await sepoliaPublicClient.waitForTransactionReceipt({
                    hash: transaction.receipt.transactionHash
                })
            let transferEventFound = false
            for (const log of transactionReceipt.logs) {
                try {
                    const event = decodeEventLog({
                        abi: erc20Abi,
                        ...log
                    })
                    if (
                        event.eventName === "Transfer" &&
                        event.args.from === account.address &&
                        event.args.value === amountToTransfer
                    ) {
                        transferEventFound = true
                    }
                } catch (error) {}
            }

            expect(userOpHash).toHaveLength(66)
            expect(transferEventFound).toBeTrue()

            await waitForNonceUpdate()
        },
        TEST_TIMEOUT
    )

    test(
        "Client send UserOp with custom nonce key",
        async () => {
            const customNonceKey = getCustomNonceKeyFromString(
                "Hello, World!",
                ENTRYPOINT_ADDRESS_V07
            )

            const nonce = await account.getNonce(customNonceKey)

            const userOpHash = await kernelClient.sendUserOperation({
                userOperation: {
                    callData: await kernelClient.account.encodeCallData({
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    }),
                    nonce
                }
            })

            expect(userOpHash).toHaveLength(66)
            await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
        },
        TEST_TIMEOUT
    )

    test(
        "Client send Transaction with paymaster",
        async () => {
            const transactionHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log("transactionHash", transactionHash)

            expect(transactionHash).toBeString()
            expect(transactionHash).toHaveLength(TX_HASH_LENGTH)
            expect(transactionHash).toMatch(TX_HASH_REGEX)

            const transactionReceipt =
                await sepoliaPublicClient.waitForTransactionReceipt({
                    hash: transactionHash
                })

            expect(findUserOperationEvent(transactionReceipt.logs)).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Client send multiple Transactions with paymaster",
        async () => {
            const response = await kernelClient.sendTransactions({
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

            expect(response).toBeString()
            expect(response).toHaveLength(66)
            expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)

            const transactionReceipt =
                await sepoliaPublicClient.waitForTransactionReceipt({
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
        "can send multi chain user ops with multi chain validator plugin",
        async () => {
            const sepoliaKernelAccount = await createKernelAccount(
                sepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    plugins: {
                        sudo: sepoliaMultiChainECDSAValidatorPlugin
                    }
                }
            )

            const optimismSepoliaKernelAccount = await createKernelAccount(
                optimismSepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    plugins: {
                        sudo: optimismsepoliaMultiChainECDSAValidatorPlugin
                    }
                }
            )

            console.log(
                "sepoliaKernelAccount.address",
                sepoliaKernelAccount.address
            )
            console.log(
                "optimismSepoliaKernelAccount.address",
                optimismSepoliaKernelAccount.address
            )

            const sepoliaZerodevKernelClient = createKernelAccountClient({
                account: sepoliaKernelAccount,
                chain: sepolia,
                bundlerTransport: http(SEPOLIA_ZERODEV_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return sepoliaZeroDevPaymasterClient.sponsorUserOperation(
                            {
                                userOperation,
                                entryPoint: getEntryPoint()
                            }
                        )
                    }
                },
                entryPoint: getEntryPoint()
            })

            const optimismSepoliaZerodevKernelClient =
                createKernelAccountClient({
                    account: optimismSepoliaKernelAccount,
                    chain: optimismSepolia,
                    bundlerTransport: http(OPTIMISM_SEPOLIA_ZERODEV_RPC_URL),
                    middleware: {
                        sponsorUserOperation: async ({ userOperation }) => {
                            return opSepoliaZeroDevPaymasterClient.sponsorUserOperation(
                                {
                                    userOperation,
                                    entryPoint: getEntryPoint()
                                }
                            )
                        }
                    },
                    entryPoint: getEntryPoint()
                })

            const sepoliaUserOp = await ecdsaPrepareMultiUserOpRequest({
                client: sepoliaZerodevKernelClient,
                args: {
                    userOperation: {
                        callData: await sepoliaKernelAccount.encodeCallData({
                            to: zeroAddress,
                            value: BigInt(0),
                            data: "0x"
                        })
                    },
                    middleware: {
                        sponsorUserOperation: async ({ userOperation }) => {
                            return sepoliaZeroDevPaymasterClient.sponsorUserOperation(
                                {
                                    userOperation,
                                    entryPoint: getEntryPoint()
                                }
                            )
                        }
                    }
                },
                numOfUserOps: 2
            })

            const optimismSepoliaUserOp = await ecdsaPrepareMultiUserOpRequest({
                client: optimismSepoliaZerodevKernelClient,
                args: {
                    userOperation: {
                        callData:
                            await optimismSepoliaKernelAccount.encodeCallData({
                                to: zeroAddress,
                                value: BigInt(0),
                                data: "0x"
                            })
                    },
                    middleware: {
                        sponsorUserOperation: async ({ userOperation }) => {
                            return opSepoliaZeroDevPaymasterClient.sponsorUserOperation(
                                {
                                    userOperation,
                                    entryPoint: getEntryPoint()
                                }
                            )
                        }
                    }
                },
                numOfUserOps: 2
            })

            const signedUserOps = await ecdsaSignUserOps({
                account: sepoliaKernelAccount,
                multiUserOps: [
                    { userOperation: sepoliaUserOp, chainId: sepolia.id },
                    {
                        userOperation: optimismSepoliaUserOp,
                        chainId: optimismSepolia.id
                    }
                ],
                entryPoint: getEntryPoint()
            })

            const sepoliaBundlerClient = sepoliaZerodevKernelClient.extend(
                bundlerActions(getEntryPoint())
            )

            const optimismSepoliaBundlerClient =
                optimismSepoliaZerodevKernelClient.extend(
                    bundlerActions(getEntryPoint())
                )

            const sepoliaUserOpHash = await sepoliaZerodevKernelClient.request({
                method: "eth_sendUserOperation",
                params: [deepHexlify(signedUserOps[0]), getEntryPoint()]
            })

            console.log("sepoliaUserOpHash", sepoliaUserOpHash)
            await sepoliaBundlerClient.waitForUserOperationReceipt({
                hash: sepoliaUserOpHash
            })

            const optimismSepoliaUserOpHash =
                await optimismSepoliaZerodevKernelClient.request({
                    method: "eth_sendUserOperation",
                    params: [deepHexlify(signedUserOps[1]), getEntryPoint()]
                })

            console.log("optimismSepoliaUserOpHash", optimismSepoliaUserOpHash)
            await optimismSepoliaBundlerClient.waitForUserOperationReceipt({
                hash: optimismSepoliaUserOpHash
            })
        },
        TEST_TIMEOUT
    )

    test(
        "can send multi chain user ops with enabling regular validators",
        async () => {
            const sepoliaSessionKeySigner = privateKeyToAccount(
                generatePrivateKey()
            )
            const sepoliaEcdsaModularSigner = toECDSASigner({
                signer: sepoliaSessionKeySigner
            })

            const optimismSepoliaSessionKeySigner = privateKeyToAccount(
                generatePrivateKey()
            )
            const optimismSepoliaEcdsaModularSigner = toECDSASigner({
                signer: optimismSepoliaSessionKeySigner
            })

            const sudoPolicy = toSudoPolicy({})

            const sepoliaPermissionPlugin = await toPermissionValidator(
                sepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    signer: sepoliaEcdsaModularSigner,
                    policies: [sudoPolicy]
                }
            )

            const optimismSepoliaPermissionPlugin = await toPermissionValidator(
                optimismSepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    signer: optimismSepoliaEcdsaModularSigner,
                    policies: [sudoPolicy]
                }
            )

            const sepoliaKernelAccount = await createKernelAccount(
                sepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    plugins: {
                        sudo: sepoliaMultiChainECDSAValidatorPlugin,
                        regular: sepoliaPermissionPlugin
                    }
                }
            )

            const optimismSepoliaKernelAccount = await createKernelAccount(
                optimismSepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    plugins: {
                        sudo: optimismsepoliaMultiChainECDSAValidatorPlugin,
                        regular: optimismSepoliaPermissionPlugin
                    }
                }
            )

            console.log(
                "sepoliaKernelAccount.address",
                sepoliaKernelAccount.address
            )
            console.log(
                "optimismSepoliaKernelAccount.address",
                optimismSepoliaKernelAccount.address
            )

            const sepoliaZerodevKernelClient = createKernelAccountClient({
                account: sepoliaKernelAccount,
                chain: sepolia,
                bundlerTransport: http(SEPOLIA_ZERODEV_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return sepoliaZeroDevPaymasterClient.sponsorUserOperation(
                            {
                                userOperation,
                                entryPoint: getEntryPoint()
                            }
                        )
                    }
                },
                entryPoint: getEntryPoint()
            })

            const optimismSepoliaZerodevKernelClient =
                createKernelAccountClient({
                    account: optimismSepoliaKernelAccount,
                    chain: optimismSepolia,
                    bundlerTransport: http(OPTIMISM_SEPOLIA_ZERODEV_RPC_URL),
                    middleware: {
                        sponsorUserOperation: async ({ userOperation }) => {
                            return opSepoliaZeroDevPaymasterClient.sponsorUserOperation(
                                {
                                    userOperation,
                                    entryPoint: getEntryPoint()
                                }
                            )
                        }
                    },
                    entryPoint: getEntryPoint()
                })

            const sepoliaUserOp =
                await sepoliaZerodevKernelClient.prepareUserOperationRequest({
                    userOperation: {
                        callData: await sepoliaKernelAccount.encodeCallData({
                            to: zeroAddress,
                            value: BigInt(0),
                            data: "0x"
                        })
                    }
                })

            const optimismSepoliaUserOp =
                await optimismSepoliaZerodevKernelClient.prepareUserOperationRequest(
                    {
                        userOperation: {
                            callData:
                                await optimismSepoliaKernelAccount.encodeCallData(
                                    {
                                        to: zeroAddress,
                                        value: BigInt(0),
                                        data: "0x"
                                    }
                                )
                        }
                    }
                )

            const signedEnableUserOps = await ecdsaSignUserOpsWithEnable({
                multiChainUserOpConfigsForEnable: [
                    {
                        account: sepoliaKernelAccount,
                        userOp: sepoliaUserOp
                    },
                    {
                        account: optimismSepoliaKernelAccount,
                        userOp: optimismSepoliaUserOp
                    }
                ]
            })

            const sepoliaBundlerClient = sepoliaZerodevKernelClient.extend(
                bundlerActions(getEntryPoint())
            )

            const optimismSepoliaBundlerClient =
                optimismSepoliaZerodevKernelClient.extend(
                    bundlerActions(getEntryPoint())
                )

            const sepoliaUserOpHash = await sepoliaZerodevKernelClient.request({
                method: "eth_sendUserOperation",
                params: [deepHexlify(signedEnableUserOps[0]), getEntryPoint()]
            })

            console.log("sepoliaUserOpHash", sepoliaUserOpHash)
            await sepoliaBundlerClient.waitForUserOperationReceipt({
                hash: sepoliaUserOpHash
            })

            const optimismSepoliaUserOpHash =
                await optimismSepoliaZerodevKernelClient.request({
                    method: "eth_sendUserOperation",
                    params: [
                        deepHexlify(signedEnableUserOps[1]),
                        getEntryPoint()
                    ]
                })

            console.log("optimismSepoliaUserOpHash", optimismSepoliaUserOpHash)
            await optimismSepoliaBundlerClient.waitForUserOperationReceipt({
                hash: optimismSepoliaUserOpHash
            })

            const sepoliaTxHashAfterEnable =
                await sepoliaZerodevKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: BigInt(0),
                    data: "0x"
                })

            console.log("sepoliaTxHashAfterEnable", sepoliaTxHashAfterEnable)

            const optimismSepoliaTxHashAfterEnable =
                await optimismSepoliaZerodevKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: BigInt(0),
                    data: "0x"
                })

            console.log(
                "optimismSepoliaTxHashAfterEnable",
                optimismSepoliaTxHashAfterEnable
            )
        },
        TEST_TIMEOUT
    )

    test(
        "can enable session key with approval using serialized account",
        async () => {
            const sepoliaSessionKeyAccount = privateKeyToAccount(
                generatePrivateKey()
            )

            const optimismSepoliaSessionKeyAccount = privateKeyToAccount(
                generatePrivateKey()
            )

            // create an empty account as the session key signer
            const sepoliaEmptyAccount = addressToEmptyAccount(
                sepoliaSessionKeyAccount.address
            )
            const optimismSepoliaEmptyAccount = addressToEmptyAccount(
                optimismSepoliaSessionKeyAccount.address
            )

            const sepoliaEmptySessionKeySigner = toECDSASigner({
                signer: sepoliaEmptyAccount
            })

            const optimismSepoliaEmptySessionKeySigner = toECDSASigner({
                signer: optimismSepoliaEmptyAccount
            })

            const sudoPolicy = toSudoPolicy({})

            // create a permission validator plugin with empty account signer
            const sepoliaPermissionPlugin = await toPermissionValidator(
                sepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    signer: sepoliaEmptySessionKeySigner,
                    policies: [sudoPolicy]
                }
            )

            const optimismSepoliaPermissionPlugin = await toPermissionValidator(
                optimismSepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    signer: optimismSepoliaEmptySessionKeySigner,
                    policies: [sudoPolicy]
                }
            )

            const sepoliaKernelAccount = await createKernelAccount(
                sepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    plugins: {
                        sudo: sepoliaMultiChainECDSAValidatorPlugin,
                        regular: sepoliaPermissionPlugin
                    }
                }
            )

            const optimismSepoliaKernelAccount = await createKernelAccount(
                optimismSepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    plugins: {
                        sudo: optimismsepoliaMultiChainECDSAValidatorPlugin,
                        regular: optimismSepoliaPermissionPlugin
                    }
                }
            )

            console.log(
                "sepoliaKernelAccount.address",
                sepoliaKernelAccount.address
            )
            console.log(
                "optimismSepoliaKernelAccount.address",
                optimismSepoliaKernelAccount.address
            )

            // serialize multi chain permission account with empty account signer, so get approvals
            const [sepoliaApproval, optimismSepoliaApproval] =
                await serializeMultiChainPermissionAccounts([
                    {
                        account: sepoliaKernelAccount
                    },
                    {
                        account: optimismSepoliaKernelAccount
                    }
                ])

            // get real session key signers
            const sepoliaSessionKeySigner = toECDSASigner({
                signer: sepoliaSessionKeyAccount
            })

            const optimismSepoliaSessionKeySigner = toECDSASigner({
                signer: optimismSepoliaSessionKeyAccount
            })

            // deserialize the permission account with the real session key signers
            const deserializeSepoliaKernelAccount =
                await deserializePermissionAccount(
                    sepoliaPublicClient,
                    getEntryPoint(),
                    kernelVersion,
                    sepoliaApproval,
                    sepoliaSessionKeySigner
                )

            const deserializeOptimismSepoliaKernelAccount =
                await deserializePermissionAccount(
                    optimismSepoliaPublicClient,
                    getEntryPoint(),
                    kernelVersion,
                    optimismSepoliaApproval,
                    optimismSepoliaSessionKeySigner
                )

            // create a kernel account client with the deserialized account
            const sepoliaZerodevKernelClient = createKernelAccountClient({
                account: deserializeSepoliaKernelAccount,
                chain: sepolia,
                bundlerTransport: http(SEPOLIA_ZERODEV_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return sepoliaZeroDevPaymasterClient.sponsorUserOperation(
                            {
                                userOperation,
                                entryPoint: getEntryPoint()
                            }
                        )
                    }
                },
                entryPoint: getEntryPoint()
            })

            const optimismSepoliaZerodevKernelClient =
                createKernelAccountClient({
                    account: deserializeOptimismSepoliaKernelAccount,
                    chain: optimismSepolia,
                    bundlerTransport: http(OPTIMISM_SEPOLIA_ZERODEV_RPC_URL),
                    middleware: {
                        sponsorUserOperation: async ({ userOperation }) => {
                            return opSepoliaZeroDevPaymasterClient.sponsorUserOperation(
                                {
                                    userOperation,
                                    entryPoint: getEntryPoint()
                                }
                            )
                        }
                    },
                    entryPoint: getEntryPoint()
                })

            // send user ops. you don't need additional enables, since it already has the approvals with serialized account
            const sepoliaTxHash =
                await sepoliaZerodevKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: BigInt(0),
                    data: "0x"
                })

            console.log("sepoliaTxHash", sepoliaTxHash)

            const optimismSepoliaTxHash =
                await optimismSepoliaZerodevKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: BigInt(0),
                    data: "0x"
                })

            console.log("optimismSepoliaTxHash", optimismSepoliaTxHash)
        },
        TEST_TIMEOUT
    )
})
