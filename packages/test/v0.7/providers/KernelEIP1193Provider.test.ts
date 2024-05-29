// @ts-expect-error
import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import type { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk"
import { KernelEIP1193Provider } from "@zerodev/wallet"
import type { BundlerClient } from "permissionless"
import type { EntryPoint } from "permissionless/types"
import {
    type Chain,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    type Transport,
    toHex,
    zeroAddress
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import type { GetCapabilitiesReturnType } from "viem/experimental"
import {
    getKernelAccountClient,
    getKernelBundlerClient,
    getPublicClient,
    getSignerToEcdsaKernelAccount,
    getZeroDevPaymasterClient
} from "../utils"
import { getZeroDevPaymasterRpc } from "./paymaster"
import { LocalStorageMock } from "./storage"

function createProvider(kernelClient: KernelAccountClient<EntryPoint>) {
    return new KernelEIP1193Provider(kernelClient)
}
const TEST_TIMEOUT = 1000000

global.localStorage = new LocalStorageMock()

describe("KernelEIP1193Provider", () => {
    let account: KernelSmartAccount<EntryPoint>
    let ownerAccount: PrivateKeyAccount
    let publicClient: PublicClient
    let bundlerClient: BundlerClient<EntryPoint>
    let kernelClient: KernelAccountClient<
        EntryPoint,
        Transport,
        Chain,
        KernelSmartAccount<EntryPoint>
    >

    beforeAll(async () => {
        const ownerPrivateKey = process.env.TEST_PRIVATE_KEY
        if (!ownerPrivateKey) {
            throw new Error("TEST_PRIVATE_KEY is not set")
        }
        ownerAccount = privateKeyToAccount(ownerPrivateKey as Hex)
        account = await getSignerToEcdsaKernelAccount()
        publicClient = await getPublicClient()
        bundlerClient = getKernelBundlerClient()
        kernelClient = await getKernelAccountClient({
            account,
            middleware: {
                sponsorUserOperation: async ({ userOperation, entryPoint }) => {
                    const zerodevPaymaster = getZeroDevPaymasterClient()
                    return zerodevPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint
                    })
                }
            }
        })
    })

    beforeEach(() => {
        global.localStorage.clear()
    })

    test("should getCapabilities", async () => {
        const provider = createProvider(kernelClient)

        const chainId = kernelClient.chain.id
        const capabilities = (await provider.request({
            method: "wallet_getCapabilities"
        })) as GetCapabilitiesReturnType

        expect(capabilities[toHex(chainId)].atomicBatch.supported).toBe(true)
        expect(capabilities[toHex(chainId)].paymasterService.supported).toBe(
            true
        )
        expect(capabilities[toHex(chainId)].permissions.supported).toBe(true)
        expect(
            capabilities[toHex(chainId)].permissions.permissionTypes.length
        ).toBeGreaterThan(0)
    })

    test(
        "should sendCalls",
        async () => {
            const provider = createProvider(kernelClient)
            const chainId = toHex(kernelClient.chain.id)
            const paymasterUrl = getZeroDevPaymasterRpc()

            const userOpHash = (await provider.request({
                method: "wallet_sendCalls",
                params: [
                    {
                        version: "1.0",
                        chainId: chainId,
                        from: account.address,
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
                        ],
                        capabilities: {
                            paymasterService: {
                                url: paymasterUrl
                            }
                        }
                    }
                ]
            })) as Hex

            console.log("userOpHash", userOpHash)
            const transaction = await bundlerClient.waitForUserOperationReceipt(
                {
                    hash: userOpHash
                }
            )
            console.log(
                "transferTransactionHash",
                `https://sepolia.etherscan.io/tx/${transaction.receipt.transactionHash}`
            )
            await publicClient.waitForTransactionReceipt({
                hash: transaction.receipt.transactionHash
            })
        },
        TEST_TIMEOUT
    )

    test(
        "should get call status",
        async () => {
            const provider = createProvider(kernelClient)
            const chainId = toHex(kernelClient.chain.id)
            const paymasterUrl = getZeroDevPaymasterRpc()

            const userOpHash = (await provider.request({
                method: "wallet_sendCalls",
                params: [
                    {
                        version: "1.0",
                        chainId: chainId,
                        from: account.address,
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
                        ],
                        capabilities: {
                            paymasterService: {
                                url: paymasterUrl
                            }
                        }
                    }
                ]
            })) as Hex

            const pendingStatus = (await provider.request({
                method: "wallet_getCallStatus",
                params: [userOpHash]
            })) as any
            expect(pendingStatus.status).toBe("PENDING")
            const transaction = await bundlerClient.waitForUserOperationReceipt(
                {
                    hash: userOpHash
                }
            )
            console.log(
                "transferTransactionHash",
                `https://sepolia.etherscan.io/tx/${transaction.receipt.transactionHash}`
            )
            const receipt = await publicClient.waitForTransactionReceipt({
                hash: transaction.receipt.transactionHash
            })
            const confirmedStatus = (await provider.request({
                method: "wallet_getCallStatus",
                params: [userOpHash]
            })) as any
            expect(confirmedStatus.status).toBe("CONFIRMED")
            expect(confirmedStatus.receipts[0].status).toBe("0x1")
            expect(confirmedStatus.receipts[0].transactionHash).toBe(
                receipt.transactionHash
            )
            expect(confirmedStatus.receipts[0].blockHash).toBe(
                receipt.blockHash
            )
        },
        TEST_TIMEOUT
    )

    test(
        "should issue permisssions",
        async () => {
            const provider = createProvider(kernelClient)
            const chainId = toHex(kernelClient.chain.id)
            const paymasterUrl = getZeroDevPaymasterRpc()

            // timestamp policy only
            const sessionId = await provider.request({
                method: "wallet_issuePermissions",
                params: [
                    {
                        permissions: [],
                        expiry: Math.floor(Date.now().valueOf() / 1000) + 86400
                    }
                ]
            })
            expect(sessionId).toBeDefined()

            const userOpHash = (await provider.request({
                method: "wallet_sendCalls",
                params: [
                    {
                        version: "1.0",
                        chainId: chainId,
                        from: account.address,
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
                        ],
                        capabilities: {
                            paymasterService: {
                                url: paymasterUrl
                            },
                            permissions: {
                                sessionId: sessionId
                            }
                        }
                    }
                ]
            })) as Hex

            const transaction = await bundlerClient.waitForUserOperationReceipt(
                {
                    hash: userOpHash
                }
            )
            console.log(
                "transferTransactionHash",
                `https://sepolia.etherscan.io/tx/${transaction.receipt.transactionHash}`
            )
            await publicClient.waitForTransactionReceipt({
                hash: transaction.receipt.transactionHash
            })
        },
        TEST_TIMEOUT
    )
})
