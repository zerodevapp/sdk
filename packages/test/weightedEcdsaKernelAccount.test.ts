import { beforeAll, describe, expect, test } from "bun:test"
import {
    EIP1271ABI,
    KERNEL_ADDRESSES,
    KernelAccountClient,
    KernelSmartAccount,
    createKernelAccount
} from "@zerodev/sdk"
import { signerToSessionKeyValidator } from "@zerodev/session-key"
import { createWeightedECDSAValidator } from "@zerodev/weighted-ecdsa-validator"
import dotenv from "dotenv"
import { BundlerClient, bundlerActions } from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    SmartAccount
} from "permissionless/accounts"
import type { UserOperation } from "permissionless/types/userOperation.js"
import {
    Address,
    Chain,
    Hex,
    type PublicClient,
    Transport,
    decodeEventLog,
    encodeFunctionData,
    getContract,
    hashTypedData,
    keccak256,
    stringToHex,
    toHex,
    zeroAddress
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { EntryPointAbi } from "./abis/EntryPoint.js"
import { GreeterAbi, GreeterBytecode } from "./abis/Greeter.js"
import {
    findUserOperationEvent,
    getEntryPoint,
    getKernelAccountClient,
    getKernelBundlerClient,
    getPublicClient,
    getSignerToEcdsaKernelAccount,
    getSignersToWeightedEcdsaKernelAccount,
    getZeroDevPaymasterClient,
    sleep,
    waitForNonceUpdate
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
const SIGNATURE_LENGTH = 132
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{130}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("Weighted ECDSA kernel Account", () => {
    let account: SmartAccount
    let publicClient: PublicClient
    let bundlerClient: BundlerClient
    let kernelClient: KernelAccountClient<Transport, Chain, KernelSmartAccount>

    beforeAll(async () => {
        account = await getSignersToWeightedEcdsaKernelAccount()
        publicClient = await getPublicClient()
        bundlerClient = getKernelBundlerClient()
        kernelClient = await getKernelAccountClient({
            account,
            sponsorUserOperation: async ({ userOperation }) => {
                const zerodevPaymaster = getZeroDevPaymasterClient()
                const entryPoint = getEntryPoint()
                return zerodevPaymaster.sponsorUserOperation({
                    userOperation,
                    entryPoint
                })
            }
        })
    })

    test("Account address should be a valid Ethereum address", async () => {
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
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

    // test(
    //     "Client signMessage should return a valid signature",
    //     async () => {
    //         // to make sure kernel is deployed
    //         await kernelClient.sendTransaction({
    //             to: zeroAddress,
    //             value: 0n,
    //             data: "0x"
    //         })
    //         const message = "hello world"
    //         const response = await kernelClient.signMessage({
    //             message
    //         })

    //         const eip1271response = await publicClient.readContract({
    //             address: account.address,
    //             abi: EIP1271ABI,
    //             functionName: "isValidSignature",
    //             args: [keccak256(stringToHex(message)), response]
    //         })
    //         expect(eip1271response).toEqual("0x1626ba7e")
    //         expect(response).toBeString()
    //         expect(response).toHaveLength(SIGNATURE_LENGTH)
    //         expect(response).toMatch(SIGNATURE_REGEX)
    //     },
    //     TEST_TIMEOUT
    // )

    test(
        "Client deploy contract",
        async () => {
            const response = await kernelClient.deployContract({
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

            expect(findUserOperationEvent(transactionReceipt.logs)).toBeTrue()
        },
        TEST_TIMEOUT
    )

    // TODO: it should send transactions without paymaster
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
                    }
                ]
            })
            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)
        },
        TEST_TIMEOUT
    )

    test(
        "Write contract",
        async () => {
            const greeterContract = getContract({
                abi: GreeterAbi,
                address: process.env.GREETER_ADDRESS as Address,
                client: kernelClient
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
            const userOp = await kernelClient.signUserOperation({
                userOperation: {
                    callData: await kernelClient.account.encodeCallData({
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

            const bundlerClient = kernelClient.extend(bundlerActions)
            const userOpHash = await bundlerClient.sendUserOperation({
                userOperation: userOp,
                entryPoint: KERNEL_ADDRESSES.ENTRYPOINT_V0_6
            })
            expect(userOpHash).toHaveLength(66)

            await waitForNonceUpdate()
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

            expect(userOpHash).toHaveLength(66)

            await waitForNonceUpdate()
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

    test.only(
        "Create a session key and send txn with it",
        async () => {
            const sessionPrivateKey = generatePrivateKey()
            const sessionKeySigner = privateKeyToAccount(sessionPrivateKey)
            const sessionKeyPlugin = await signerToSessionKeyValidator(
                publicClient,
                {
                    signer: sessionKeySigner,
                    validatorData: {
                        permissions: []
                    }
                }
            )

            const sessionKeyAccount =
                await getSignersToWeightedEcdsaKernelAccount(sessionKeyPlugin)
            const sessionKeyClient = await getKernelAccountClient({
                account: sessionKeyAccount,
                sponsorUserOperation: async ({ userOperation }) => {
                    const zerodevPaymaster = getZeroDevPaymasterClient()
                    const entryPoint = getEntryPoint()
                    return zerodevPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint
                    })
                }
            })

            const userOpHash = await sessionKeyClient.sendUserOperation({
                userOperation: {
                    callData: await sessionKeyAccount.encodeCallData({
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    })
                }
            })

            expect(userOpHash).toHaveLength(66)

            await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
        },
        TEST_TIMEOUT
    )
})
