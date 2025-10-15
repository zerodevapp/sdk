// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import {
    getKernelAddressFromECDSA,
    signerToEcdsaValidator
} from "@zerodev/ecdsa-validator"
import {
    constants,
    EIP1271Abi,
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    createKernelAccount,
    getCustomNonceKeyFromString,
    getERC20PaymasterApproveCall,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import { gasTokenAddresses } from "@zerodev/sdk"
import dotenv from "dotenv"
import { ethers } from "ethers"
import {
    type Address,
    type Chain,
    type GetContractReturnType,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    type Transport,
    decodeEventLog,
    encodeFunctionData,
    erc20Abi,
    getContract,
    hashMessage,
    hashTypedData,
    parseEther,
    zeroAddress
} from "viem"
import {
    type SmartAccount,
    entryPoint06Address
} from "viem/account-abstraction"
import { privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import { EntryPointAbi } from "./abis/EntryPoint.js"
import { GreeterAbi, GreeterBytecode } from "./abis/Greeter.js"
import { TEST_ERC20Abi } from "./abis/Test_ERC20Abi.js"
import { TokenActionsAbi } from "./abis/TokenActionsAbi.js"
import { TOKEN_ACTION_ADDRESS, config } from "./config.js"
import {
    Test_ERC20Address,
    findUserOperationEvent,
    getEntryPoint,
    getPublicClient,
    getZeroDevPaymasterClient,
    index,
    kernelVersion,
    mintToAccount,
    waitForNonceUpdate
} from "./utils_0_6/common.js"
import {
    getEcdsaKernelAccountWithRandomSigner,
    getKernelAccountClient,
    getSignerToEcdsaKernelAccount
} from "./utils_0_6/ecdsaUtils.js"

dotenv.config()

const requiredEnvVars = [
    "FACTORY_ADDRESS",
    "TEST_PRIVATE_KEY",
    "RPC_URL",
    "ENTRYPOINT_ADDRESS",
    "GREETER_ADDRESS",
    "ZERODEV_PROJECT_ID",
    "ZERODEV_BUNDLER_RPC_HOST",
    "ZERODEV_PAYMASTER_RPC_HOST"
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

describe("ECDSA kernel Account", () => {
    let account: SmartAccount<KernelSmartAccountImplementation<"0.6">>
    let ownerAccount: PrivateKeyAccount
    let publicClient: PublicClient
    let kernelClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation<"0.6">>
    >
    let greeterContract: GetContractReturnType<
        typeof GreeterAbi,
        typeof kernelClient,
        Address
    >

    beforeAll(async () => {
        const ownerPrivateKey = process.env.TEST_PRIVATE_KEY
        if (!ownerPrivateKey) {
            throw new Error("TEST_PRIVATE_KEY is not set")
        }
        ownerAccount = privateKeyToAccount(ownerPrivateKey as Hex)
        account = await getSignerToEcdsaKernelAccount()
        publicClient = await getPublicClient()
        const zerodevPaymaster = getZeroDevPaymasterClient()
        kernelClient = await getKernelAccountClient({
            account,
            paymaster: zerodevPaymaster
        })
        greeterContract = getContract({
            abi: GreeterAbi,
            address: process.env.GREETER_ADDRESS as Address,
            client: kernelClient
        })
    })

    test("Account address should be a valid Ethereum address", async () => {
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(account.address).not.toEqual(zeroAddress)
        console.log("account.address: ", account.address)
    })

    test("getKernelAddressFromECDSA util should return valid account address", async () => {
        const generatedAccountAddress = await getKernelAddressFromECDSA({
            entryPoint: getEntryPoint(),
            kernelVersion,
            eoaAddress: ownerAccount.address,
            index: index,
            initCodeHash:
                constants.KernelVersionToAddressesMap[kernelVersion]
                    .initCodeHash ?? "0x"
        })
        console.log(
            "Generate accountAddress using getKernelAddressFromECDSA: ",
            generatedAccountAddress
        )
        expect(account.address).toEqual(generatedAccountAddress)
    })

    // test("Account should throw when trying to sign a transaction", async () => {
    //     await expect(async () => {
    //         await account.signTransaction({
    //             to: zeroAddress,
    //             value: 0n,
    //             data: "0x"
    //         })
    //     }).toThrow(new SignTransactionNotSupportedBySmartAccount())
    // })

    test(
        "Should validate message signatures for undeployed accounts (6492)",
        async () => {
            const account = await getEcdsaKernelAccountWithRandomSigner()
            const message = "hello world"
            const signature = await account.signMessage({
                message
            })

            expect(
                await verifyEIP6492Signature({
                    signer: account.address,
                    hash: hashMessage(message),
                    signature: signature,
                    client: publicClient
                })
            ).toBeTrue()

            // Try using Ambire as well
            const ambireResult = await verifyMessage({
                signer: account.address,
                message,
                signature: signature,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.6"][sepolia.id].rpcUrl
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

            const account = await getEcdsaKernelAccountWithRandomSigner()
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
                    client: publicClient
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
                    config["0.6"][sepolia.id].rpcUrl
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
            await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            const message = "hello world"
            const response = await kernelClient.signMessage({
                message
            })
            const ambireResult = await verifyMessage({
                signer: account.address,
                message,
                signature: response,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.6"][sepolia.id].rpcUrl
                )
            })
            expect(ambireResult).toBeTrue()

            const eip1271response = await publicClient.readContract({
                address: account.address,
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

            const response = await kernelClient.signTypedData({
                domain,
                primaryType,
                types,
                message
            })

            const eip1271response = await publicClient.readContract({
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
            const callData = await kernelClient.account.encodeDeployCallData({
                abi: GreeterAbi,
                bytecode: GreeterBytecode
            })
            const response = await kernelClient.sendTransaction({
                callData
            })

            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)

            const transactionReceipt =
                await publicClient.waitForTransactionReceipt({
                    hash: response
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
                publicClient,
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
                                    "0xA02CDdFa44B8C01b4257F54ac1c43F75801E8175"
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
                await publicClient.waitForTransactionReceipt({
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
                "0.6"
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
            const response = await kernelClient.sendTransaction({
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

            expect(findUserOperationEvent(transactionReceipt.logs)).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Client send multiple Transactions with paymaster",
        async () => {
            const account = await getSignerToEcdsaKernelAccount()

            const publicClient = await getPublicClient()

            const zerodevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account,
                paymaster: zerodevPaymaster
            })

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

    // stkae too low
    test.skip(
        "Client send transaction with ERC20 paymaster",
        async () => {
            const account = await getSignerToEcdsaKernelAccount()

            const publicClient = await getPublicClient()

            const zerodevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account,
                paymaster: zerodevPaymaster
            })

            const response = await kernelClient.sendTransaction({
                calls: [
                    // {
                    //     to: gasTokenAddresses[sepolia.id].USDC,
                    //     data: encodeFunctionData({
                    //         abi: TEST_ERC20Abi,
                    //         functionName: "mint",
                    //         args: [account.address, parseEther("0.9")]
                    //     }),
                    //     value: 0n
                    // },
                    await getERC20PaymasterApproveCall(zerodevPaymaster, {
                        gasToken: gasTokenAddresses[sepolia.id].USDC,
                        approveAmount: parseEther("0.9"),
                        entryPoint: getEntryPoint()
                    }),
                    {
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    }
                ],
                paymasterContext: {
                    token: gasTokenAddresses[sepolia.id].USDC
                }
            })

            console.log(
                "erc20PMTransaction:",
                `https://sepolia.etherscan.io/tx/${response}`
            )

            expect(response).toBeString()
            expect(response).toHaveLength(66)
            expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)

            const transactionReceipt =
                await publicClient.waitForTransactionReceipt({
                    hash: response
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
                        event.args.from === account.address
                    ) {
                        transferEventFound = true
                    }
                } catch (error) {}
            }
            let userOpEventFound = false
            for (const log of transactionReceipt.logs) {
                // Encapsulated inside a try catch since if a log isn't wanted from this abi it will throw an error
                try {
                    const event = decodeEventLog({
                        abi: EntryPointAbi,
                        ...log
                    })
                    if (event.eventName === "UserOperationEvent") {
                        userOpEventFound = true
                        console.log(
                            "jiffyScanLink:",
                            `https://jiffyscan.xyz/userOpHash/${event.args.userOpHash}?network=sepolia/`
                        )
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

            expect(transferEventFound).toBeTrue()
            expect(userOpEventFound).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Can use a deployed account",
        async () => {
            const initialEcdsaSmartAccount =
                await getSignerToEcdsaKernelAccount()
            const publicClient = await getPublicClient()
            const zerodevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: initialEcdsaSmartAccount,
                paymaster: zerodevPaymaster
            })

            // Send an initial tx to deploy the account
            const hash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })

            // Wait for the tx to be done (so we are sure that the account is deployed)
            await publicClient.waitForTransactionReceipt({ hash })
            const deployedAccountAddress = initialEcdsaSmartAccount.address

            // Build a new account with a valid owner
            const signer = privateKeyToAccount(
                process.env.TEST_PRIVATE_KEY as Hex
            )
            const ecdsaValidatorPlugin = await signerToEcdsaValidator(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer,
                    kernelVersion
                }
            )
            const alreadyDeployedEcdsaSmartAccount = await createKernelAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    kernelVersion,
                    plugins: {
                        sudo: ecdsaValidatorPlugin
                    },
                    address: deployedAccountAddress,
                    index
                }
            )

            // Ensure the two account have the same address
            expect(alreadyDeployedEcdsaSmartAccount.address).toMatch(
                initialEcdsaSmartAccount.address
            )
        },
        TEST_TIMEOUT
    )
})
