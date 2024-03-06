import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import {
    EIP1271ABI,
    KERNEL_ADDRESSES,
    KernelAccountClient,
    KernelSmartAccount,
    getERC20PaymasterApproveCall
} from "@zerodev/sdk"
import { gasTokenAddresses } from "@zerodev/sdk"
import dotenv from "dotenv"
import { ethers } from "ethers"
import { BundlerClient } from "permissionless"
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
    erc20Abi,
    getContract,
    hashMessage,
    hashTypedData,
    zeroAddress
} from "viem"
import { goerli } from "viem/chains"
import { EntryPointAbi } from "./abis/EntryPoint.js"
import { GreeterAbi, GreeterBytecode } from "./abis/Greeter.js"
import { TEST_ERC20Abi } from "./abis/Test_ERC20Abi.js"
import {
    findUserOperationEvent,
    getEntryPoint,
    getKernelAccountClient,
    getKernelBundlerClient,
    getKernelV1Account,
    getPublicClient,
    getSignerToEcdsaKernelAccount,
    getZeroDevERC20PaymasterClient,
    getZeroDevPaymasterClient,
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

describe("ECDSA kernel Account", () => {
    let account: SmartAccount
    let publicClient: PublicClient
    let bundlerClient: BundlerClient
    let kernelClient: KernelAccountClient<Transport, Chain, KernelSmartAccount>

    beforeAll(async () => {
        account = await getKernelV1Account()
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
                    process.env.RPC_URL as string
                )
            })
            expect(ambireResult).toBeTrue()

            const eip1271response = await publicClient.readContract({
                address: account.address,
                abi: EIP1271ABI,
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

    test(
        "Client send transaction with ERC20 paymaster",
        async () => {
            const account = await getSignerToEcdsaKernelAccount()

            const publicClient = await getPublicClient()

            const bundlerClient = getKernelBundlerClient()

            const kernelClient = await getKernelAccountClient({
                account,
                sponsorUserOperation: async ({
                    entryPoint: _entryPoint,
                    userOperation
                }): Promise<UserOperation> => {
                    const zerodevPaymaster = getZeroDevERC20PaymasterClient()
                    return zerodevPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint: getEntryPoint(),
                        gasToken: gasTokenAddresses[goerli.id]["6TEST"]
                    })
                }
            })

            const pmClient = await getZeroDevERC20PaymasterClient()
            const response = await kernelClient.sendTransactions({
                transactions: [
                    {
                        to: gasTokenAddresses[goerli.id]["6TEST"],
                        data: encodeFunctionData({
                            abi: TEST_ERC20Abi,
                            functionName: "mint",
                            args: [account.address, 100000n]
                        }),
                        value: 0n
                    },
                    await getERC20PaymasterApproveCall(pmClient, {
                        gasToken: gasTokenAddresses[goerli.id]["6TEST"],
                        approveAmount: 100000n
                    }),
                    {
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    }
                ]
            })

            console.log(
                "erc20PMTransaction:",
                `https://mumbai.polygonscan.com/tx/${response}`
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
                            `https://jiffyscan.xyz/userOpHash/${event.args.userOpHash}?network=mumbai/`
                        )
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

            expect(transferEventFound).toBeTrue()
            expect(userOpEventFound).toBeTrue()
        },
        TEST_TIMEOUT
    )
})
