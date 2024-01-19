import { beforeAll, describe, expect, test } from "bun:test"
import {
    constants,
    KernelAccountAbi,
    KernelAccountClient,
    KernelSmartAccount,
    TokenActionsAbi
} from "@kerneljs/core"
import {
    ParamOperator,
    type SessionKeyPlugin,
    anyPaymaster,
    deserializeSessionKeyAccount,
    deserializeSessionKeyAccountParams,
    serializeSessionKeyAccount,
    signerToSessionKeyValidator
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
    getAbiItem,
    getFunctionSelector,
    pad,
    parseEther,
    zeroAddress
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { polygonMumbai } from "viem/chains"
import { TEST_ERC20Abi } from "./abis/Test_ERC20Abi.js"
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
    const transfer20ActionSelector = getFunctionSelector(
        getAbiItem({
            abi: TokenActionsAbi,
            name: "transfer20Action"
        })
    )
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
        await mintToAccount(100000000n)

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

    test("should execute the erc20 token transfer action using SessionKey and Token Action executor", async () => {
        await mintToAccount(100000000n)
        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
                signer: privateKeyToAccount(generatePrivateKey())
            }
        )

        const _sessionKeySmartAccountClient = await getKernelAccountClient({
            account: await getSessionKeyToSessionKeyKernelAccount(
                sessionKeyPlugin,
                {
                    executor: constants.TOKEN_ACTION,
                    selector: transfer20ActionSelector
                }
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
            abi: TokenActionsAbi,
            functionName: "transfer20Action",
            args: [Test_ERC20Address, amountToTransfer, owner.address]
        })

        const balanceOfReceipientBefore = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [owner.address]
        })
        const transferTransactionHash =
            await _sessionKeySmartAccountClient.sendTransaction({
                to: accountAddress,
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

    test("should execute any tx using SessionKey when no permissions set", async () => {
        await mintToAccount(100000000n)
        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
                signer: privateKeyToAccount(generatePrivateKey())
            }
        )

        const _sessionKeySmartAccountClient = await getKernelAccountClient({
            account:
                await getSessionKeyToSessionKeyKernelAccount(sessionKeyPlugin),
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
            account:
                await getSessionKeyToSessionKeyKernelAccount(sessionKeyPlugin),
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
                sessionKeyPlugin,
                {
                    selector: executeBatchSelector,
                    executor: zeroAddress
                }
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

    test("should execute the native token transfer action using SessionKey", async () => {
        await mintToAccount(100000000n)
        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
                signer: privateKeyToAccount(generatePrivateKey()),
                validatorData: {
                    permissions: [
                        {
                            target: zeroAddress,
                            valueLimit: parseEther("0.000001")
                        }
                    ]
                }
            }
        )

        const _sessionKeySmartAccountClient = await getKernelAccountClient({
            account:
                await getSessionKeyToSessionKeyKernelAccount(sessionKeyPlugin),
            sponsorUserOperation: async ({ userOperation }) => {
                const kernelPaymaster = getZeroDevPaymasterClient()
                const entryPoint = getEntryPoint()
                return kernelPaymaster.sponsorUserOperation({
                    userOperation,
                    entryPoint
                })
            }
        })

        const amountToTransfer = parseEther("0.00000001")

        const balanceOfBefore = await client.getBalance({
            address: owner.address
        })
        const transferTransactionHash =
            await _sessionKeySmartAccountClient.sendTransaction({
                to: owner.address,
                data: pad("0x", { size: 4 }),
                value: amountToTransfer
            })

        console.log(
            "transferTransactionHash",
            `https://mumbai.polygonscan.com/tx/${transferTransactionHash}`
        )
        const balanceOfAfter = await client.getBalance({
            address: owner.address
        })
        expect(balanceOfAfter - balanceOfBefore).toBe(amountToTransfer)
    }, 1000000)

    test("should reject the tx using SessionKey if valueLimit exceeds", async () => {
        await mintToAccount(100000000n)
        const sessionPrivateKey = generatePrivateKey()
        const sessionKeyAccount = privateKeyToAccount(sessionPrivateKey)
        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
                signer: sessionKeyAccount,
                validatorData: {
                    permissions: [
                        {
                            target: zeroAddress,
                            valueLimit: parseEther("0.000000001")
                        }
                    ]
                }
            }
        )
        const account =
            await getSessionKeyToSessionKeyKernelAccount(sessionKeyPlugin)
        const serializedSessionKeyAccountParams =
            await serializeSessionKeyAccount(account, sessionPrivateKey)

        const _sessionKeySmartAccountClient = await getKernelAccountClient({
            account: await deserializeSessionKeyAccount(
                publicClient,
                serializedSessionKeyAccountParams
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

        const amountToTransfer = parseEther("0.000001")
        let errMsg = ""
        try {
            const tx = await _sessionKeySmartAccountClient.sendTransaction({
                to: owner.address,
                data: pad("0x", { size: 4 }),
                value: amountToTransfer
            })
            console.log("tx", tx)
        } catch (error) {
            errMsg = error.message
        }
        expect(errMsg).toMatch(
            "SessionKeyValidator: No matching permission found for the userOp"
        )
    }, 1000000)

    test("should reject the erc20 token transfer action using SessionKey without paymaster", async () => {
        await mintToAccount(100000000n)
        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
                signer: privateKeyToAccount(generatePrivateKey()),
                validatorData: {
                    paymaster: anyPaymaster,
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
            account:
                await getSessionKeyToSessionKeyKernelAccount(sessionKeyPlugin)
        })

        const amountToTransfer = 10000n
        const transferData = encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [owner.address, amountToTransfer]
        })

        let errMsg = ""
        try {
            await _sessionKeySmartAccountClient.sendTransaction({
                to: Test_ERC20Address,
                data: transferData
            })
        } catch (error) {
            errMsg = error.message
        }
        expect(errMsg).toMatch("SessionKeyValidator: paymaster not set")
    }, 1000000)

    test("should serialize and deserialize valueLimit correctly", async () => {
        const bigInt = 123456789123456789123456789123456789n
        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
                signer: privateKeyToAccount(generatePrivateKey()),
                validatorData: {
                    permissions: [
                        {
                            target: Test_ERC20Address,
                            abi: TEST_ERC20Abi,
                            functionName: "transfer",
                            valueLimit: bigInt
                        }
                    ]
                }
            }
        )
        const account =
            await getSessionKeyToSessionKeyKernelAccount(sessionKeyPlugin)
        const serializedSessionKeyAccountParams =
            await serializeSessionKeyAccount(account)

        const params = deserializeSessionKeyAccountParams(
            serializedSessionKeyAccountParams
        )

        expect(params.sessionKeyParams.permissions?.[0].valueLimit === bigInt)
    }, 1000000)
})
