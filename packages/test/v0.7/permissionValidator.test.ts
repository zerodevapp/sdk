import { beforeAll, describe, expect, test } from "bun:test"
import {
    KernelAccountClient,
    KernelSmartAccount,
    KernelV3AccountAbi
} from "@zerodev/sdk"
import { BundlerClient } from "permissionless"
import { PimlicoBundlerClient } from "permissionless/clients/pimlico"
import { EntryPoint } from "permissionless/types/entrypoint"
import {
    Address,
    Chain,
    Hex,
    PrivateKeyAccount,
    PublicClient,
    Transport,
    decodeAbiParameters,
    decodeErrorResult,
    decodeFunctionData,
    encodeFunctionData,
    zeroAddress
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import {
    toGasPolicy,
    toSignatureCallerPolicy,
    toSudoPolicy
} from "../../../plugins/permission/policies"
import { toCallPolicy } from "../../../plugins/permission/policies/toCallPolicy"
import { toRateLimitPolicy } from "../../../plugins/permission/policies/toRateLimitPolicy"
import { ParamCondition } from "../../../plugins/permission/policies/types"
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi"
import { Test_ERC20Address } from "../utils"
import {
    getEntryPoint,
    getKernelAccountClient,
    getKernelBundlerClient,
    getPimlicoBundlerClient,
    getPublicClient,
    getSignerToEcdsaKernelAccount,
    getSignerToPermissionKernelAccount,
    getSignerToRootPermissionKernelAccount,
    getSignerToRootPermissionWithSecondaryValidatorKernelAccount,
    getZeroDevPaymasterClient,
    sleep
} from "./utils"

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("Permission kernel Account", () => {
    let publicClient: PublicClient
    let bundlerClient: BundlerClient<EntryPoint>
    let ecdsaSmartAccountClient: KernelAccountClient<
        EntryPoint,
        Transport,
        Chain,
        KernelSmartAccount<EntryPoint>
    >
    let pimlicoBundlerClient: PimlicoBundlerClient<EntryPoint>
    let owner: PrivateKeyAccount

    async function mintToAccount(target: Address, amount: bigint) {
        const balanceBefore = await publicClient.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [target]
        })

        console.log("balanceBefore of account", balanceBefore)

        const amountToMint = balanceBefore > amount ? 0n : amount

        const mintData = encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "mint",
            args: [target, amountToMint]
        })

        if (amountToMint > 0n) {
            const mintTransactionHash =
                await ecdsaSmartAccountClient.sendTransaction({
                    to: Test_ERC20Address,
                    data: mintData
                })

            const balanceAfter = await publicClient.readContract({
                abi: TEST_ERC20Abi,
                address: Test_ERC20Address,
                functionName: "balanceOf",
                args: [target]
            })

            console.log("balanceAfter of account", balanceAfter)

            console.log(
                "mintTransactionHash",
                `https://sepolia.etherscan.io/tx/${mintTransactionHash}`
            )
        }
    }

    beforeAll(async () => {
        const testPrivateKey = process.env.TEST_PRIVATE_KEY as Hex
        owner = privateKeyToAccount(testPrivateKey)
        publicClient = await getPublicClient()
        bundlerClient = getKernelBundlerClient()
        pimlicoBundlerClient = getPimlicoBundlerClient()

        const ecdsaAccount = await getSignerToEcdsaKernelAccount()

        ecdsaSmartAccountClient = await getKernelAccountClient({
            account: ecdsaAccount,
            middleware: {
                gasPrice: async () =>
                    (
                        await pimlicoBundlerClient.getUserOperationGasPrice()
                    ).fast,
                sponsorUserOperation: async ({ userOperation }) => {
                    const zeroDevPaymaster = getZeroDevPaymasterClient()
                    return zeroDevPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint: getEntryPoint()
                    })
                }
            }
        })
    })

    test("Account address should be a valid Ethereum address", async () => {
        const account = ecdsaSmartAccountClient.account
        console.log("Account address:", account.address)
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(account.address).not.toEqual(zeroAddress)
    })

    test(
        "Smart account client send transaction with GasPolicy and PermissionValidator as root",
        async () => {
            const gasPolicy = await toGasPolicy({
                allowed: 1000000000000000000n
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToRootPermissionKernelAccount([
                    gasPolicy
                ]),
                middleware: {
                    gasPrice: async () =>
                        (
                            await pimlicoBundlerClient.getUserOperationGasPrice()
                        ).fast,
                    sponsorUserOperation: async ({ userOperation }) => {
                        const zeroDevPaymaster = getZeroDevPaymasterClient()
                        return zeroDevPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                }
            })

            console.log("Gas policy account")

            const response = await permissionSmartAccountClient.sendTransaction(
                {
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                }
            )

            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)
            console.log("Transaction hash:", response)
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send transaction with Sudo Policy and PermissionValidator as root with ECDSA Validator as secondary",
        async () => {
            const permissionSmartAccountClient = await getKernelAccountClient({
                account:
                    await getSignerToRootPermissionWithSecondaryValidatorKernelAccount(
                        [await toSudoPolicy({})]
                    ),
                middleware: {
                    gasPrice: async () =>
                        (
                            await pimlicoBundlerClient.getUserOperationGasPrice()
                        ).fast,
                    sponsorUserOperation: async ({ userOperation }) => {
                        const zeroDevPaymaster = getZeroDevPaymasterClient()
                        return zeroDevPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                }
            })

            const response = await permissionSmartAccountClient.sendTransaction(
                {
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                }
            )

            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)
            console.log("Transaction hash:", response)
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send transaction with GasPolicy",
        async () => {
            const gasPolicy = await toGasPolicy({
                allowed: 1000000000000000000n
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([gasPolicy]),
                middleware: {
                    gasPrice: async () =>
                        (
                            await pimlicoBundlerClient.getUserOperationGasPrice()
                        ).fast,
                    sponsorUserOperation: async ({ userOperation }) => {
                        const zeroDevPaymaster = getZeroDevPaymasterClient()
                        return zeroDevPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                }
            })

            console.log("Gas policy account")

            const response = await permissionSmartAccountClient.sendTransaction(
                {
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                }
            )

            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)
            console.log("Transaction hash:", response)
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send transaction with SignaturePolicy",
        async () => {
            const signaturePolicy = await toSignatureCallerPolicy({
                allowedCallers: [zeroAddress]
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([
                    signaturePolicy
                ]),
                middleware: {
                    gasPrice: async () =>
                        (
                            await pimlicoBundlerClient.getUserOperationGasPrice()
                        ).fast,
                    sponsorUserOperation: async ({ userOperation }) => {
                        const zeroDevPaymaster = getZeroDevPaymasterClient()
                        return zeroDevPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                }
            })

            const response = await permissionSmartAccountClient.sendTransaction(
                {
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                }
            )

            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)
            console.log("Transaction hash:", response)
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send transaction with RateLimitPolicy ",
        async () => {
            const startAt = Math.floor(Date.now() / 1000)

            const rateLimitPolicy = await toRateLimitPolicy({
                interval: 5,
                count: 2,
                startAt
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([
                    rateLimitPolicy
                ]),
                middleware: {
                    gasPrice: async () =>
                        (
                            await pimlicoBundlerClient.getUserOperationGasPrice()
                        ).fast,
                    sponsorUserOperation: async ({ userOperation }) => {
                        const zeroDevPaymaster = getZeroDevPaymasterClient()
                        return zeroDevPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                }
            })

            await sleep(5000)

            const response = await permissionSmartAccountClient.sendTransaction(
                {
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                }
            )

            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)
            console.log("Transaction hash:", response)

            const response2 =
                await permissionSmartAccountClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })

            expect(response2).toBeString()
            expect(response2).toHaveLength(TX_HASH_LENGTH)
            expect(response2).toMatch(TX_HASH_REGEX)
            console.log("Transaction hash:", response2)
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send transaction with CallPolicy",
        async () => {
            const callPolicy = await toCallPolicy({
                permissions: [
                    {
                        abi: TEST_ERC20Abi,
                        target: Test_ERC20Address,
                        functionName: "transfer",
                        args: [
                            {
                                condition: ParamCondition.EQUAL,
                                value: owner.address
                            },
                            null
                        ]
                    }
                ]
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([callPolicy]),
                middleware: {
                    gasPrice: async () =>
                        (
                            await pimlicoBundlerClient.getUserOperationGasPrice()
                        ).fast,
                    sponsorUserOperation: async ({ userOperation }) => {
                        const zeroDevPaymaster = getZeroDevPaymasterClient()
                        return zeroDevPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                }
            })

            await mintToAccount(
                permissionSmartAccountClient.account.address,
                100000000n
            )

            const amountToTransfer = 10000n
            const transferData = encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [owner.address, amountToTransfer]
            })

            const balanceOfReceipientBefore = await publicClient.readContract({
                abi: TEST_ERC20Abi,
                address: Test_ERC20Address,
                functionName: "balanceOf",
                args: [owner.address]
            })

            console.log("balanceOfReceipientBefore", balanceOfReceipientBefore)

            const response = await permissionSmartAccountClient.sendTransaction(
                {
                    to: Test_ERC20Address,
                    data: transferData
                }
            )

            console.log("Transaction hash:", response)

            const balanceOfReceipientAfter = await publicClient.readContract({
                abi: TEST_ERC20Abi,
                address: Test_ERC20Address,
                functionName: "balanceOf",
                args: [owner.address]
            })

            console.log("balanceOfReceipientAfter", balanceOfReceipientAfter)

            expect(balanceOfReceipientAfter).toBe(
                balanceOfReceipientBefore + amountToTransfer
            )
        },
        TEST_TIMEOUT
    )
})

//         preVerificationGas: 84700n,
//         callGasLimit: 1273781n,
//         verificationGasLimit: 726789n
