import { beforeAll, describe, expect, test } from "bun:test"
import { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk"
import { EntryPoint } from "permissionless/_types/types"
import {
    http,
    Address,
    Chain,
    Hex,
    PrivateKeyAccount,
    PublicClient,
    Transport,
    createPublicClient,
    encodeFunctionData,
    pad,
    parseEther,
    zeroAddress
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { polygonMumbai } from "viem/chains"
import { toGasPolicy } from "../../plugins/modularPermission/policies/toGasPolicy"
import {
    ParamOperator,
    toMerklePolicy
} from "../../plugins/modularPermission/policies/toMerklePolicy"
import { TEST_ERC20Abi } from "./abis/Test_ERC20Abi"
import {
    Test_ERC20Address,
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getSignerToEcdsaKernelAccount,
    getSignerToModularPermissionKernelAccount,
    getZeroDevPaymasterClient
} from "./utils"

const TEST_TIMEOUT = 1000000

describe("Modular Permission kernel Account", async () => {
    let publicClient: PublicClient
    let accountAddress: Address
    let testPrivateKey: Hex
    let owner: PrivateKeyAccount

    let ecdsaSmartAccountClient: KernelAccountClient<
        EntryPoint,
        Transport,
        Chain,
        KernelSmartAccount<EntryPoint>
    >

    async function mintToAccount(amount: bigint) {
        const balanceBefore = await publicClient.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [accountAddress]
        })

        const amountToMint = balanceBefore > amount ? 0n : amount

        const mintData = encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "mint",
            args: [accountAddress, amountToMint]
        })

        if (amountToMint > 0n) {
            const mintTransactionHash =
                await ecdsaSmartAccountClient.sendTransaction({
                    to: Test_ERC20Address,
                    data: mintData
                })
            console.log(
                "mintTransactionHash",
                `https://mumbai.polygonscan.com/tx/${mintTransactionHash}`
            )
        }
    }

    beforeAll(async () => {
        publicClient = await getPublicClient()
        testPrivateKey = process.env.TEST_PRIVATE_KEY as Hex
        owner = privateKeyToAccount(testPrivateKey)
        ecdsaSmartAccountClient = await getKernelAccountClient({
            account: await getSignerToEcdsaKernelAccount(),
            middleware: {
                sponsorUserOperation: async ({ userOperation, entryPoint }) => {
                    const kernelPaymaster = getZeroDevPaymasterClient()
                    return kernelPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint
                    })
                }
            }
        })
        accountAddress = (await ecdsaSmartAccountClient.account
            ?.address) as Address
    })

    test(
        "should execute a transaction using GasPolicy",
        async () => {
            const modularPermissionSmartAccountClient =
                await getKernelAccountClient({
                    account: await getSignerToModularPermissionKernelAccount([
                        await toGasPolicy({
                            maxGasAllowedInWei: 1000000000000000000n
                        })
                    ]),
                    middleware: {
                        sponsorUserOperation: async ({
                            userOperation,
                            entryPoint
                        }) => {
                            const kernelPaymaster = getZeroDevPaymasterClient()
                            return kernelPaymaster.sponsorUserOperation({
                                userOperation,
                                entryPoint
                            })
                        }
                    }
                })

            const txHash =
                await modularPermissionSmartAccountClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            console.log("txHash", `https://mumbai.polygonscan.com/tx/${txHash}`)
        },
        TEST_TIMEOUT
    )

    test(
        "should execute the erc20 token transfer action using MerklePolicy",
        async () => {
            await mintToAccount(100000000n)
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
            const modularPermissionSmartAccountClient =
                await getKernelAccountClient({
                    account: await getSignerToModularPermissionKernelAccount([
                        await toGasPolicy({
                            maxGasAllowedInWei: 1000000000000000000n
                        }),
                        await toMerklePolicy({
                            permissions: [
                                {
                                    target: Test_ERC20Address,
                                    abi: TEST_ERC20Abi,
                                    functionName: "transfer",
                                    args: [
                                        {
                                            operator: ParamOperator.EQUAL,
                                            value: owner.address
                                        },
                                        null
                                    ]
                                }
                            ]
                        })
                    ]),
                    middleware: {
                        sponsorUserOperation: async ({
                            userOperation,
                            entryPoint
                        }) => {
                            const kernelPaymaster = getZeroDevPaymasterClient()
                            return kernelPaymaster.sponsorUserOperation({
                                userOperation,
                                entryPoint
                            })
                        }
                    }
                })

            const txHash =
                await modularPermissionSmartAccountClient.sendTransaction({
                    to: Test_ERC20Address,
                    data: transferData
                })
            console.log("txHash", `https://mumbai.polygonscan.com/tx/${txHash}`)
            const balanceOfReceipientAfter = await publicClient.readContract({
                abi: TEST_ERC20Abi,
                address: Test_ERC20Address,
                functionName: "balanceOf",
                args: [owner.address]
            })
            expect(balanceOfReceipientAfter).toBe(
                balanceOfReceipientBefore + amountToTransfer
            )
        },
        TEST_TIMEOUT
    )

    test(
        "should execute the tx to zeroAddress using MerklePolicy",
        async () => {
            const modularPermissionSmartAccountClient =
                await getKernelAccountClient({
                    account: await getSignerToModularPermissionKernelAccount([
                        await toMerklePolicy({
                            permissions: [
                                {
                                    target: zeroAddress
                                }
                            ]
                        })
                    ]),
                    middleware: {
                        sponsorUserOperation: async ({
                            userOperation,
                            entryPoint
                        }) => {
                            const kernelPaymaster = getZeroDevPaymasterClient()
                            return kernelPaymaster.sponsorUserOperation({
                                userOperation,
                                entryPoint
                            })
                        }
                    }
                })

            const txHash =
                await modularPermissionSmartAccountClient.sendTransaction({
                    to: zeroAddress,
                    data: pad("0x", { size: 4 })
                })
            console.log("txHash", `https://mumbai.polygonscan.com/tx/${txHash}`)
        },
        TEST_TIMEOUT
    )
})
