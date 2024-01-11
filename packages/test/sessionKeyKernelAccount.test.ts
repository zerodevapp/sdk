import { beforeAll, describe, expect, test } from "bun:test"
import {
    KernelAccountAbi,
    KernelAccountClient,
    KernelSmartAccount
} from "@kerneljs/core"
import {
    signerToSessionKeyValidator,
    type SessionKeyPlugin,
    ParamOperator
} from "@kerneljs/session-key"
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
    zeroAddress,
    getFunctionSelector,
    getAbiItem
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { polygonMumbai } from "viem/chains"
import { TEST_ERC20Abi } from "./abis/Test_ERC20Abi"
import {
    Test_ERC20Address,
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getSessionKeyToSessionKeyKernelAccount,
    getSignerToEcdsaKernelAccount,
    getSignerToSessionKeyKernelAccount,
    getZeroDevPaymasterClient
} from "./utils"

describe("Session Key kernel Account", async () => {
    let publicClient: PublicClient
    const client = await createPublicClient({
        chain: polygonMumbai,
        transport: http(process.env.RPC_URL as string)
    })
    const executeBatchSelector = getFunctionSelector(
        getAbiItem({
            abi: KernelAccountAbi,
            name: "executeBatch"
        })
    )
    let sessionKeyValidatorPlugin: SessionKeyPlugin
    let testPrivateKey: Hex
    let owner: PrivateKeyAccount
    let accountAddress: Address
    let ecdsaSmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        KernelSmartAccount
    >
    let sessionKeySmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        KernelSmartAccount
    >

    async function mintToAccount(amount: bigint) {
        const balanceBefore = await client.readContract({
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

        sessionKeySmartAccountClient = await getKernelAccountClient({
            account: await getSignerToSessionKeyKernelAccount(),
            sponsorUserOperation: async ({ userOperation }) => {
                const kernelPaymaster = getZeroDevPaymasterClient()
                const entryPoint = getEntryPoint()
                return kernelPaymaster.sponsorUserOperation({
                    userOperation,
                    entryPoint
                })
            }
        })
        accountAddress = (await sessionKeySmartAccountClient.account
            ?.address) as Address

        ecdsaSmartAccountClient = await getKernelAccountClient({
            account: await getSignerToEcdsaKernelAccount(),
            sponsorUserOperation: async ({ userOperation }) => {
                const kernelPaymaster = getZeroDevPaymasterClient()
                const entryPoint = getEntryPoint()
                return kernelPaymaster.sponsorUserOperation({
                    userOperation,
                    entryPoint
                })
            }
        })
    })

    test("should execute the erc20 token transfer action using SessionKey", async () => {
        console.log("accountAddress", accountAddress)
        await mintToAccount(100000000n)

        const amountToTransfer = 100000000n
        const transferData = encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [owner.address, amountToTransfer]
        })

        const balanceOfReceipientBefore = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [owner.address]
        })
        const transferTransactionHash =
            await sessionKeySmartAccountClient.sendTransaction({
                to: Test_ERC20Address,
                data: transferData
            })

        console.log(
            "transferTransactionHash",
            `https://mumbai.polygonscan.com/tx/${transferTransactionHash}`
        )
        const balanceOfReceipientAfter = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [owner.address]
        })
        expect(balanceOfReceipientAfter).toBe(
            balanceOfReceipientBefore + amountToTransfer
        )
    }, 1000000)

    test("should execute the erc20 token transfer action using SessionKey with wildcard target permission", async () => {
        await mintToAccount(100000000n)
        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
                signer: privateKeyToAccount(generatePrivateKey()),
                validatorData: {
                    permissions: [
                        {
                            target: zeroAddress,
                            abi: TEST_ERC20Abi,
                            functionName: "transfer",
                            args: [
                                {
                                    operator: ParamOperator.EQUAL,
                                    value: owner.address
                                },
                                {
                                    operator: ParamOperator.LESS_THAN_OR_EQUAL,
                                    value: 10000n
                                }
                            ]
                        }
                    ]
                }
            }
        )

        const _sessionKeySmartAccountClient = await getKernelAccountClient({
            account: await getSessionKeyToSessionKeyKernelAccount(
                sessionKeyPlugin
            ),
            sponsorUserOperation: async ({ userOperation }) => {
                const kernelPaymaster = getZeroDevPaymasterClient()
                const entryPoint = getEntryPoint()
                return kernelPaymaster.sponsorUserOperation({
                    userOperation,
                    entryPoint
                })
            }
        })

        const amountToTransfer = 10000n
        const transferData = encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [owner.address, amountToTransfer]
        })

        const balanceOfReceipientBefore = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [owner.address]
        })
        const transferTransactionHash =
            await _sessionKeySmartAccountClient.sendTransaction({
                to: Test_ERC20Address,
                data: transferData
            })

        console.log(
            "transferTransactionHash",
            `https://mumbai.polygonscan.com/tx/${transferTransactionHash}`
        )
        const balanceOfReceipientAfter = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [owner.address]
        })
        expect(balanceOfReceipientAfter).toBe(
            balanceOfReceipientBefore + amountToTransfer
        )
    }, 1000000)

    test("should execute batch the erc20 token transfer action using SessionKey", async () => {
        await mintToAccount(100000000n)
        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
                signer: privateKeyToAccount(generatePrivateKey()),
                executorData: { selector: executeBatchSelector },
                validatorData: {
                    permissions: [
                        {
                            target: zeroAddress,
                            abi: TEST_ERC20Abi,
                            functionName: "increaseAllowance"
                        },
                        {
                            target: Test_ERC20Address,
                            abi: TEST_ERC20Abi,
                            functionName: "transfer",
                            args: [
                                {
                                    operator: ParamOperator.EQUAL,
                                    value: owner.address
                                },
                                {
                                    operator: ParamOperator.LESS_THAN_OR_EQUAL,
                                    value: 10000n
                                }
                            ]
                        }
                    ]
                }
            }
        )

        const _sessionKeySmartAccountClient = await getKernelAccountClient({
            account: await getSessionKeyToSessionKeyKernelAccount(
                sessionKeyPlugin
            ),
            sponsorUserOperation: async ({ userOperation }) => {
                const kernelPaymaster = getZeroDevPaymasterClient()
                const entryPoint = getEntryPoint()
                return kernelPaymaster.sponsorUserOperation({
                    userOperation,
                    entryPoint
                })
            }
        })

        const amountToTransfer = 10000n
        const transferData = encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [owner.address, amountToTransfer]
        })
        const increaseAllowanceData = encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "increaseAllowance",
            args: [owner.address, amountToTransfer]
        })

        const balanceOfReceipientBefore = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [owner.address]
        })
        const allowanceBefore = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "allowance",
            args: [accountAddress, owner.address]
        })
        const transferTransactionHash =
            await _sessionKeySmartAccountClient.sendTransactions({
                transactions: [
                    {
                        to: Test_ERC20Address,
                        data: increaseAllowanceData,
                        value: 0n
                    },
                    {
                        to: Test_ERC20Address,
                        data: transferData,
                        value: 0n
                    }
                ]
            })

        console.log(
            "transferTransactionHash",
            `https://mumbai.polygonscan.com/tx/${transferTransactionHash}`
        )
        const balanceOfReceipientAfter = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [owner.address]
        })
        const allowanceAfter = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "allowance",
            args: [accountAddress, owner.address]
        })
        expect(balanceOfReceipientAfter).toBe(
            balanceOfReceipientBefore + amountToTransfer
        )
        expect(allowanceAfter).toBe(allowanceBefore + amountToTransfer)
    }, 1000000)
})
