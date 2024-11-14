// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import {
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    type ZeroDevPaymasterClient,
    getCustomNonceKeyFromString
} from "@zerodev/sdk"
import { signerToSessionKeyValidator } from "@zerodev/session-key"
import dotenv from "dotenv"
import {
    type Address,
    type Chain,
    type PublicClient,
    type Transport,
    encodeFunctionData,
    getContract,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { GreeterAbi, GreeterBytecode } from "./abis/Greeter.js"
import {
    findUserOperationEvent,
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getSignersToWeightedEcdsaKernelAccount,
    getZeroDevPaymasterClient,
    kernelVersion,
    waitForNonceUpdate
} from "./utils_0_6"

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
    let account: SmartAccount<KernelSmartAccountImplementation<"0.6">>
    let publicClient: PublicClient
    let kernelClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation<"0.6">>
    >
    let zeroDevPaymaster: ZeroDevPaymasterClient

    beforeAll(async () => {
        account = await getSignersToWeightedEcdsaKernelAccount()
        publicClient = await getPublicClient()
        zeroDevPaymaster = getZeroDevPaymasterClient()
        kernelClient = await getKernelAccountClient({
            account,
            paymaster: zeroDevPaymaster
        })
    })

    test("Account address should be a valid Ethereum address", async () => {
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
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
            const response = await kernelClient.sendTransaction({
                callData: await kernelClient.account.encodeDeployCallData({
                    abi: GreeterAbi,
                    bytecode: GreeterBytecode
                })
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
            const userOpHash = await kernelClient.sendUserOperation({
                callData: await kernelClient.account.encodeCalls(
                    [
                        {
                            to: zeroAddress,
                            value: 0n,
                            data: "0x"
                        }
                    ],
                    "delegatecall"
                )
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
            console.log("userOpHash", userOpHash)

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
        "Create a session key and send txn with it",
        async () => {
            const sessionPrivateKey = generatePrivateKey()
            const sessionKeySigner = privateKeyToAccount(sessionPrivateKey)
            const sessionKeyPlugin = await signerToSessionKeyValidator(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: sessionKeySigner,
                    validatorData: {
                        permissions: []
                    },
                    kernelVersion
                }
            )

            const sessionKeyAccount =
                await getSignersToWeightedEcdsaKernelAccount(sessionKeyPlugin)
            const sessionKeyClient = await getKernelAccountClient({
                account: sessionKeyAccount,
                paymaster: zeroDevPaymaster
            })

            const userOpHash = await sessionKeyClient.sendUserOperation({
                callData: await sessionKeyAccount.encodeCalls([
                    {
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    }
                ])
            })

            expect(userOpHash).toHaveLength(66)

            await kernelClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
        },
        TEST_TIMEOUT
    )
})
