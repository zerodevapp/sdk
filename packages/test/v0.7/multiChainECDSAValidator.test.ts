// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import {
    ecdsaSignUserOpsWithEnable,
    signUserOperations
} from "@zerodev/multi-chain-ecdsa-validator"
import { toMultiChainECDSAValidator } from "@zerodev/multi-chain-ecdsa-validator"
import {
    type SendUserOperationsParameters,
    sendUserOperations
} from "@zerodev/multi-chain-ecdsa-validator/actions/sendUserOperations.js"
import {
    EIP1271Abi,
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
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
    http,
    type Address,
    type Chain,
    type Client,
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
    parseEther,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { optimismSepolia, sepolia } from "viem/chains"
import { deserializePermissionAccount } from "../../../plugins/permission/deserializePermissionAccount.js"
import { toSudoPolicy } from "../../../plugins/permission/policies/index.js"
import { serializeMultiChainPermissionAccounts } from "../../../plugins/permission/serializeMultiChainPermissionAccounts.js"
import { toECDSASigner } from "../../../plugins/permission/signers/index.js"
import { toPermissionValidator } from "../../../plugins/permission/toPermissionValidator.js"
import { EntryPointAbi } from "../abis/EntryPoint.js"
import { GreeterAbi, GreeterBytecode } from "../abis/Greeter.js"
import { TokenActionsAbi } from "../abis/TokenActionsAbi.js"
import { TOKEN_ACTION_ADDRESS, config } from "../config.js"
import {
    Test_ERC20Address,
    findUserOperationEvent,
    getBundlerRpc,
    getEntryPoint,
    getPaymasterRpc,
    getPublicClient,
    kernelVersion,
    mintToAccount,
    validateEnvironmentVariables,
    waitForNonceUpdate
} from "./utils"

// const requiredEnvVars = [
//     "TEST_PRIVATE_KEY",
//     "GREETER_ADDRESS",
//     "SEPOLIA_RPC_URL",
//     "OPTIMISM_SEPOLIA_RPC_URL",
//     "SEPOLIA_ZERODEV_RPC_URL",
//     "SEPOLIA_ZERODEV_PAYMASTER_RPC_URL",
//     "OPTIMISM_SEPOLIA_ZERODEV_RPC_URL",
//     "OPTIMISM_SEPOLIA_ZERODEV_PAYMASTER_RPC_URL"
// ]

// validateEnvironmentVariables(requiredEnvVars)

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

const SEPOLIA_RPC_URL = process.env.RPC_URL_SEPOLIA
const OPTIMISM_SEPOLIA_RPC_URL = process.env.RPC_URL_OP_SEPOLIA

const SEPOLIA_ZERODEV_RPC_URL = getBundlerRpc(
    config["0.7"][sepolia.id].projectId
)
const SEPOLIA_ZERODEV_PAYMASTER_RPC_URL = getPaymasterRpc(
    config["0.7"][sepolia.id].projectId
)
const OPTIMISM_SEPOLIA_ZERODEV_RPC_URL = getBundlerRpc(
    config["0.7"][optimismSepolia.id].projectId
)
const OPTIMISM_SEPOLIA_ZERODEV_PAYMASTER_RPC_URL = getPaymasterRpc(
    config["0.7"][optimismSepolia.id].projectId
)

const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY

describe("MultiChainECDSAValidator", () => {
    let sepoliaPublicClient: PublicClient<Transport, typeof sepolia>
    let optimismSepoliaPublicClient: PublicClient<
        Transport,
        typeof optimismSepolia
    >

    let sepoliaZeroDevPaymasterClient: ZeroDevPaymasterClient
    let opSepoliaZeroDevPaymasterClient: ZeroDevPaymasterClient

    let signer: PrivateKeyAccount
    let sepoliaMultiChainECDSAValidatorPlugin: KernelValidator<"MultiChainECDSAValidator">
    let optimismsepoliaMultiChainECDSAValidatorPlugin: KernelValidator<"MultiChainECDSAValidator">

    let account: SmartAccount<KernelSmartAccountImplementation>
    let kernelClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >
    let greeterContract: GetContractReturnType<
        typeof GreeterAbi,
        typeof kernelClient,
        Address
    >
    let owner: Address

    beforeAll(async () => {
        sepoliaPublicClient = createPublicClient({
            transport: http(SEPOLIA_RPC_URL),
            chain: sepolia
        })
        optimismSepoliaPublicClient = createPublicClient({
            transport: http(OPTIMISM_SEPOLIA_RPC_URL),
            chain: optimismSepolia
        })

        sepoliaZeroDevPaymasterClient = createZeroDevPaymasterClient({
            chain: sepolia,
            transport: http(SEPOLIA_ZERODEV_PAYMASTER_RPC_URL)
        })

        opSepoliaZeroDevPaymasterClient = createZeroDevPaymasterClient({
            chain: optimismSepolia,
            transport: http(OPTIMISM_SEPOLIA_ZERODEV_PAYMASTER_RPC_URL)
        })

        signer = privateKeyToAccount(PRIVATE_KEY as Hex)

        sepoliaMultiChainECDSAValidatorPlugin =
            await toMultiChainECDSAValidator(sepoliaPublicClient, {
                entryPoint: getEntryPoint(),
                kernelVersion,
                signer,
                multiChainIds: [sepolia.id, optimismSepolia.id]
            })
        optimismsepoliaMultiChainECDSAValidatorPlugin =
            await toMultiChainECDSAValidator(optimismSepoliaPublicClient, {
                entryPoint: getEntryPoint(),
                kernelVersion,
                signer,
                multiChainIds: [sepolia.id, optimismSepolia.id]
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
            paymaster: sepoliaZeroDevPaymasterClient
        })

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
                    config["0.7"][sepolia.id].rpcUrl
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
                    config["0.7"][sepolia.id].rpcUrl
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
                    config["0.7"][sepolia.id].rpcUrl
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
                    config["0.7"][sepolia.id].rpcUrl
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
                callData: await kernelClient.account.encodeDeployCallData({
                    abi: GreeterAbi,
                    bytecode: GreeterBytecode
                })
            })

            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)

            const rcpt = await kernelClient.waitForUserOperationReceipt({
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
            const response = await kernelClient.sendTransaction({
                calls: [
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
                callData: await kernelClient.account.encodeCalls([
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
            })
            expect(userOp.signature).not.toBe("0x")

            const userOpHash = await kernelClient.sendUserOperation({
                ...userOp
            })
            expect(userOpHash).toHaveLength(66)
            await kernelClient.waitForUserOperationReceipt({
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
            const amountToMint = parseEther("0.99999")
            const amountToTransfer = 4337n
            await mintToAccount(
                sepoliaPublicClient,
                kernelClient,
                accountAddress,
                amountToMint
            )
            const userOpHash = await kernelClient.sendUserOperation({
                callData: await kernelClient.account.encodeCalls(
                    [
                        {
                            to: TOKEN_ACTION_ADDRESS,
                            value: 0n,
                            data: encodeFunctionData({
                                abi: TokenActionsAbi,
                                functionName: "transferERC20Action",
                                args: [
                                    Test_ERC20Address,
                                    amountToTransfer,
                                    owner
                                ]
                            })
                        }
                    ],
                    "delegatecall"
                )
            })
            const transaction = await kernelClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
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
                "0.7"
            )

            const nonce = await account.getNonce({ key: customNonceKey })

            const userOpHash = await kernelClient.sendUserOperation({
                callData: await kernelClient.account.encodeCalls([
                    {
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    }
                ]),
                nonce
            })

            expect(userOpHash).toHaveLength(66)
            await kernelClient.waitForUserOperationReceipt({
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
            const response = await kernelClient.sendTransaction({
                calls: [
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
                            await kernelClient.getUserOperation({
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
                paymaster: sepoliaZeroDevPaymasterClient
            })

            const optimismSepoliaZerodevKernelClient =
                createKernelAccountClient({
                    account: optimismSepoliaKernelAccount,
                    chain: optimismSepolia,
                    bundlerTransport: http(OPTIMISM_SEPOLIA_ZERODEV_RPC_URL),
                    paymaster: opSepoliaZeroDevPaymasterClient
                })

            const clients: Client<Transport, Chain, SmartAccount>[] = [
                {
                    ...sepoliaZerodevKernelClient
                },
                {
                    ...optimismSepoliaZerodevKernelClient
                }
            ]

            const userOps = await Promise.all(
                clients.map(async (client) => {
                    return {
                        callData: await client.account.encodeCalls([
                            {
                                to: zeroAddress,
                                value: BigInt(0),
                                data: "0x"
                            }
                        ])
                    }
                })
            )

            const userOpParams: SendUserOperationsParameters[] = [
                {
                    ...userOps[0],
                    chainId: sepolia.id
                },
                {
                    ...userOps[1],
                    chainId: optimismSepolia.id
                }
            ]

            const userOpHashes = await sendUserOperations(clients, userOpParams)

            console.log("userOpHashes", userOpHashes)
            const sepoliaUserOpHash = userOpHashes[0]
            const optimismSepoliaUserOpHash = userOpHashes[1]

            console.log("sepoliaUserOpHash", sepoliaUserOpHash)
            await sepoliaZerodevKernelClient.waitForUserOperationReceipt({
                hash: sepoliaUserOpHash
            })

            console.log("optimismSepoliaUserOpHash", optimismSepoliaUserOpHash)
            await optimismSepoliaZerodevKernelClient.waitForUserOperationReceipt(
                {
                    hash: optimismSepoliaUserOpHash
                }
            )
        },
        TEST_TIMEOUT
    )

    test(
        "can send multi chain user ops with enabling regular validators",
        async () => {
            const sepoliaSessionKeySigner = privateKeyToAccount(
                generatePrivateKey()
            )
            const sepoliaEcdsaModularSigner = await toECDSASigner({
                signer: sepoliaSessionKeySigner
            })

            const optimismSepoliaSessionKeySigner = privateKeyToAccount(
                generatePrivateKey()
            )
            const optimismSepoliaEcdsaModularSigner = await toECDSASigner({
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
                paymaster: sepoliaZeroDevPaymasterClient
            })

            const optimismSepoliaZerodevKernelClient =
                createKernelAccountClient({
                    account: optimismSepoliaKernelAccount,
                    chain: optimismSepolia,
                    bundlerTransport: http(OPTIMISM_SEPOLIA_ZERODEV_RPC_URL),
                    paymaster: opSepoliaZeroDevPaymasterClient
                })

            const clients: Client<Transport, Chain, SmartAccount>[] = [
                {
                    ...sepoliaZerodevKernelClient
                },
                {
                    ...optimismSepoliaZerodevKernelClient
                }
            ]

            const userOps = await Promise.all(
                clients.map(async (client) => {
                    return {
                        callData: await client.account.encodeCalls([
                            {
                                to: zeroAddress,
                                value: BigInt(0),
                                data: "0x"
                            }
                        ])
                    }
                })
            )

            const userOpParams: SendUserOperationsParameters[] = [
                {
                    ...userOps[0],
                    chainId: sepolia.id
                },
                {
                    ...userOps[1],
                    chainId: optimismSepolia.id
                }
            ]

            const userOpHashes = await sendUserOperations(clients, userOpParams)

            console.log("userOpHashes", userOpHashes)

            const sepoliaUserOpHash = userOpHashes[0]

            console.log("sepoliaUserOpHash", sepoliaUserOpHash)
            await sepoliaZerodevKernelClient.waitForUserOperationReceipt({
                hash: sepoliaUserOpHash
            })

            const optimismSepoliaUserOpHash = userOpHashes[1]

            console.log("optimismSepoliaUserOpHash", optimismSepoliaUserOpHash)
            await optimismSepoliaZerodevKernelClient.waitForUserOperationReceipt(
                {
                    hash: optimismSepoliaUserOpHash
                }
            )

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

            const sepoliaEmptySessionKeySigner = await toECDSASigner({
                signer: sepoliaEmptyAccount
            })

            const optimismSepoliaEmptySessionKeySigner = await toECDSASigner({
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
            const sepoliaSessionKeySigner = await toECDSASigner({
                signer: sepoliaSessionKeyAccount
            })

            const optimismSepoliaSessionKeySigner = await toECDSASigner({
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
                paymaster: sepoliaZeroDevPaymasterClient
            })

            const optimismSepoliaZerodevKernelClient =
                createKernelAccountClient({
                    account: deserializeOptimismSepoliaKernelAccount,
                    chain: optimismSepolia,
                    bundlerTransport: http(OPTIMISM_SEPOLIA_ZERODEV_RPC_URL),
                    paymaster: opSepoliaZeroDevPaymasterClient
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
