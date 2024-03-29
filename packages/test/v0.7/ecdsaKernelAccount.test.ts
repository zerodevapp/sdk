import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    EIP1271ABI,
    KernelAccountClient,
    KernelSmartAccount,
    createKernelAccount,
    getERC20PaymasterApproveCall,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import { gasTokenAddresses } from "@zerodev/sdk"
import { universalValidatorByteCode } from "@zerodev/sdk/accounts"
import dotenv from "dotenv"
import { ethers } from "ethers"
import { BundlerClient } from "permissionless"
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import { PimlicoBundlerClient } from "permissionless/clients/pimlico.js"
import { EntryPoint } from "permissionless/types/entrypoint.js"
import {
    Address,
    Chain,
    Client,
    GetContractReturnType,
    Hex,
    type PublicClient,
    Transport,
    concat,
    decodeEventLog,
    encodeAbiParameters,
    encodeFunctionData,
    erc20Abi,
    getContract,
    hashMessage,
    hashTypedData,
    parseAbiParameters,
    zeroAddress
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { goerli } from "viem/chains"
import { EntryPointAbi } from "../abis/EntryPoint.js"
import { GreeterAbi, GreeterBytecode } from "../abis/Greeter.js"
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi.js"
import { config } from "../config.js"
import {
    findUserOperationEvent,
    getEcdsaKernelAccountWithRandomSigner,
    getEntryPoint,
    getKernelAccountClient,
    getKernelBundlerClient,
    getPimlicoBundlerClient,
    getPimlicoPaymasterClient,
    getPublicClient,
    getSignerToEcdsaKernelAccount,
    getZeroDevERC20PaymasterClient,
    getZeroDevPaymasterClient,
    index,
    waitForNonceUpdate,
    waitForUserOperationTransaction
} from "./utils.js"

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
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("ECDSA kernel Account", () => {
    let account: KernelSmartAccount<EntryPoint>
    let publicClient: PublicClient
    let bundlerClient: BundlerClient<EntryPoint>
    let pimlicoBundlerClient: PimlicoBundlerClient<EntryPoint>
    let kernelClient: KernelAccountClient<
        EntryPoint,
        Transport,
        Chain,
        KernelSmartAccount<EntryPoint>
    >
    let greeterContract: GetContractReturnType<
        typeof GreeterAbi,
        typeof kernelClient,
        Address
    >

    beforeAll(async () => {
        account = await getSignerToEcdsaKernelAccount()
        publicClient = await getPublicClient()
        bundlerClient = getKernelBundlerClient()
        pimlicoBundlerClient = getPimlicoBundlerClient()
        kernelClient = await getKernelAccountClient({
            account,
            middleware: {
                sponsorUserOperation: async ({ userOperation }) => {
                    const zeroDevPaymaster = getZeroDevPaymasterClient()
                    return zeroDevPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint: getEntryPoint()
                    })
                }
            }
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

            const eip1271response = await publicClient.readContract({
                address: account.address,
                abi: EIP1271ABI,
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

            const eip1271response = await publicClient.readContract({
                address: account.address,
                abi: EIP1271ABI,
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
                await publicClient.waitForTransactionReceipt({
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

            const userOpHash = await bundlerClient.sendUserOperation({
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
            const userOpHash = await kernelClient.sendUserOperation({
                userOperation: {
                    callData: await kernelClient.account.encodeCallData({
                        to: zeroAddress,
                        value: 0n,
                        data: "0x",
                        callType: "delegatecall"
                    })
                }
            })
            const txHash = await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
            console.log("txHash", txHash)

            expect(userOpHash).toHaveLength(66)

            await waitForNonceUpdate()
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
                await publicClient.waitForTransactionReceipt({
                    hash: transactionHash
                })

            expect(findUserOperationEvent(transactionReceipt.logs)).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Client send multiple Transactions with paymaster",
        async () => {
            const account = await getSignerToEcdsaKernelAccount()

            const kernelClient = await getKernelAccountClient({
                account,
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        const zeroDevPaymaster = getZeroDevPaymasterClient()
                        return zeroDevPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                }
            })

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

    // [TODO] - erc20 paymaster integration with EP v0.7
    // test(
    //     "Client send transaction with ERC20 paymaster",
    //     async () => {
    //         const account = await getSignerToEcdsaKernelAccount()

    //         const publicClient = await getPublicClient()

    //         const bundlerClient = getKernelBundlerClient()

    //         const kernelClient = await getKernelAccountClient({
    //             account,
    //             middleware: {
    //                 sponsorUserOperation: async ({
    //                     entryPoint,
    //                     userOperation
    //                 }) => {
    //                     const zerodevPaymaster =
    //                         getZeroDevERC20PaymasterClient()
    //                     return zerodevPaymaster.sponsorUserOperation({
    //                         userOperation,
    //                         entryPoint,
    //                         gasToken: gasTokenAddresses[goerli.id]["6TEST"]
    //                     })
    //                 }
    //             }
    //         })

    //         const pmClient = await getZeroDevERC20PaymasterClient()
    //         const response = await kernelClient.sendTransactions({
    //             transactions: [
    //                 {
    //                     to: gasTokenAddresses[goerli.id]["6TEST"],
    //                     data: encodeFunctionData({
    //                         abi: TEST_ERC20Abi,
    //                         functionName: "mint",
    //                         args: [account.address, 100000n]
    //                     }),
    //                     value: 0n
    //                 },
    //                 await getERC20PaymasterApproveCall(pmClient, {
    //                     gasToken: gasTokenAddresses[goerli.id]["6TEST"],
    //                     approveAmount: 100000n
    //                 }),
    //                 {
    //                     to: zeroAddress,
    //                     value: 0n,
    //                     data: "0x"
    //                 }
    //             ]
    //         })

    //         console.log(
    //             "erc20PMTransaction:",
    //             `https://mumbai.polygonscan.com/tx/${response}`
    //         )

    //         expect(response).toBeString()
    //         expect(response).toHaveLength(66)
    //         expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)

    //         const transactionReceipt =
    //             await publicClient.waitForTransactionReceipt({
    //                 hash: response
    //             })

    //         let transferEventFound = false
    //         for (const log of transactionReceipt.logs) {
    //             try {
    //                 const event = decodeEventLog({
    //                     abi: erc20Abi,
    //                     ...log
    //                 })
    //                 if (
    //                     event.eventName === "Transfer" &&
    //                     event.args.from === account.address
    //                 ) {
    //                     transferEventFound = true
    //                 }
    //             } catch (error) {}
    //         }
    //         let userOpEventFound = false
    //         for (const log of transactionReceipt.logs) {
    //             // Encapsulated inside a try catch since if a log isn't wanted from this abi it will throw an error
    //             try {
    //                 const event = decodeEventLog({
    //                     abi: EntryPointAbi,
    //                     ...log
    //                 })
    //                 if (event.eventName === "UserOperationEvent") {
    //                     userOpEventFound = true
    //                     console.log(
    //                         "jiffyScanLink:",
    //                         `https://jiffyscan.xyz/userOpHash/${event.args.userOpHash}?network=mumbai/`
    //                     )
    //                     const userOperation =
    //                         await bundlerClient.getUserOperationByHash({
    //                             hash: event.args.userOpHash
    //                         })
    //                     expect(
    //                         userOperation?.userOperation.paymasterAndData
    //                     ).not.toBe("0x")
    //                 }
    //             } catch {}
    //         }

    //         expect(transferEventFound).toBeTrue()
    //         expect(userOpEventFound).toBeTrue()
    //     },
    //     TEST_TIMEOUT
    // )

    test(
        "Can use a deployed account",
        async () => {
            const initialEcdsaSmartAccount =
                await getSignerToEcdsaKernelAccount()
            const kernelClient = await getKernelAccountClient({
                account: initialEcdsaSmartAccount,
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        const zeroDevPaymaster = getZeroDevPaymasterClient()
                        return zeroDevPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                }
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
                    signer
                }
            )
            const alreadyDeployedEcdsaSmartAccount = await createKernelAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    plugins: {
                        sudo: ecdsaValidatorPlugin,
                        entryPoint: getEntryPoint()
                    },
                    deployedAccountAddress,
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
