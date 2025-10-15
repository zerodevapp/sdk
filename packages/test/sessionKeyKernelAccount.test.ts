// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import {
    KernelAccountAbi,
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    type ZeroDevPaymasterClient
} from "@zerodev/sdk"
import {
    Operation,
    ParamOperator,
    anyPaymaster,
    deserializeSessionKeyAccount,
    deserializeSessionKeyAccountParams,
    serializeSessionKeyAccount,
    signerToSessionKeyValidator
} from "@zerodev/session-key"
import {
    http,
    type Address,
    type Chain,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    getAbiItem,
    pad,
    parseEther,
    toFunctionSelector,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import { TEST_ERC20Abi } from "./abis/Test_ERC20Abi.js"
import { TokenActionsAbi } from "./abis/TokenActionsAbi.js"
import { TOKEN_ACTION_ADDRESS, config } from "./config.js"
import {
    Test_ERC20Address,
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getSessionKeyToSessionKeyKernelAccount,
    getSignerToEcdsaKernelAccount,
    getSignerToSessionKeyKernelAccount,
    getZeroDevPaymasterClient,
    kernelVersion
} from "./utils_0_6"

describe("Session Key kernel Account", async () => {
    let publicClient: PublicClient
    const client = await createPublicClient({
        chain: sepolia,
        transport: http(config["0.6"][sepolia.id].rpcUrl as string)
    })
    const executeBatchSelector = toFunctionSelector(
        getAbiItem({
            abi: KernelAccountAbi,
            name: "executeBatch"
        })
    )
    const transfer20ActionSelector = toFunctionSelector(
        getAbiItem({
            abi: TokenActionsAbi,
            name: "transferERC20Action"
        })
    )
    let testPrivateKey: Hex
    let owner: PrivateKeyAccount
    let accountAddress: Address
    let ecdsaSmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation<"0.6">>
    >
    let sessionKeySmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation<"0.6">>
    >
    let zerodevPaymaster: ZeroDevPaymasterClient

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
            console.log("Minting to account")
            const mintTransactionHash =
                await ecdsaSmartAccountClient.sendTransaction({
                    to: Test_ERC20Address,
                    data: mintData
                })
            console.log(
                "mintTransactionHash",
                `https://sepolia.etherscan.io/tx/${mintTransactionHash}`
            )
        }
    }

    beforeAll(async () => {
        publicClient = await getPublicClient()
        testPrivateKey = process.env.TEST_PRIVATE_KEY as Hex
        owner = privateKeyToAccount(testPrivateKey)
        zerodevPaymaster = getZeroDevPaymasterClient()

        sessionKeySmartAccountClient = await getKernelAccountClient({
            account: await getSignerToSessionKeyKernelAccount(),
            paymaster: zerodevPaymaster
        })
        accountAddress = sessionKeySmartAccountClient.account.address

        ecdsaSmartAccountClient = await getKernelAccountClient({
            account: await getSignerToEcdsaKernelAccount(),
            paymaster: zerodevPaymaster
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
            `https://sepolia.etherscan.io/tx/${transferTransactionHash}`
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
                entryPoint: getEntryPoint(),
                kernelVersion,
                signer: privateKeyToAccount(generatePrivateKey())
            }
        )

        const _sessionKeySmartAccountClient = await getKernelAccountClient({
            account: await getSessionKeyToSessionKeyKernelAccount(
                sessionKeyPlugin,
                {
                    address: TOKEN_ACTION_ADDRESS,
                    selector: transfer20ActionSelector
                }
            ),
            paymaster: zerodevPaymaster
        })

        const amountToTransfer = 10000n
        const transferData = encodeFunctionData({
            abi: TokenActionsAbi,
            functionName: "transferERC20Action",
            args: [Test_ERC20Address, amountToTransfer, owner.address]
        })

        const balanceOfReceipientBefore = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [owner.address]
        })
        const userOpHash =
            await _sessionKeySmartAccountClient.sendUserOperation({
                callData: transferData
            })
        console.log(
            "jiffyScanLink:",
            `https://jiffyscan.xyz/userOpHash/${userOpHash}?network=sepolia/`
        )
        const {
            receipt: { transactionHash: transferTransactionHash }
        } = await _sessionKeySmartAccountClient.waitForUserOperationReceipt({
            hash: userOpHash
        })

        console.log(
            "transferTransactionHash",
            `https://sepolia.etherscan.io/tx/${transferTransactionHash}`
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
                entryPoint: getEntryPoint(),
                kernelVersion,
                signer: privateKeyToAccount(generatePrivateKey())
            }
        )

        const _sessionKeySmartAccountClient = await getKernelAccountClient({
            account:
                await getSessionKeyToSessionKeyKernelAccount(sessionKeyPlugin),
            paymaster: zerodevPaymaster
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
            `https://sepolia.etherscan.io/tx/${transferTransactionHash}`
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
                entryPoint: getEntryPoint(),
                kernelVersion,
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
            paymaster: zerodevPaymaster
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
            `https://sepolia.etherscan.io/tx/${transferTransactionHash}`
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
                entryPoint: getEntryPoint(),
                kernelVersion,
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
                    address: zeroAddress
                }
            ),
            paymaster: zerodevPaymaster
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
            await _sessionKeySmartAccountClient.sendTransaction({
                calls: [
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
            `https://sepolia.etherscan.io/tx/${transferTransactionHash}`
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

    // outdated testing
    test.skip("should execute the native token transfer action using SessionKey", async () => {
        await mintToAccount(100000000n)
        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
                entryPoint: getEntryPoint(),
                kernelVersion,
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
            paymaster: zerodevPaymaster
        })

        const amountToTransfer = parseEther("0.0000000001")

        const balanceOfBefore = await client.getBalance({
            address: owner.address
        })
        const transferTransactionHash =
            await _sessionKeySmartAccountClient.sendTransaction({
                to: owner.address,
                data: "0x",
                value: amountToTransfer
            })

        console.log(
            "transferTransactionHash",
            `https://sepolia.etherscan.io/tx/${transferTransactionHash}`
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
                entryPoint: getEntryPoint(),
                kernelVersion,
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
                getEntryPoint(),
                kernelVersion,
                serializedSessionKeyAccountParams
            ),
            paymaster: zerodevPaymaster
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
                entryPoint: getEntryPoint(),
                kernelVersion,
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
                entryPoint: getEntryPoint(),
                kernelVersion,
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

    test("should execute the erc20 token transfer action via delegate call using SessionKey and Token Action executor", async () => {
        await mintToAccount(100000000n)
        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
                entryPoint: getEntryPoint(),
                kernelVersion,
                signer: privateKeyToAccount(generatePrivateKey()),
                validatorData: {
                    permissions: [
                        {
                            target: TOKEN_ACTION_ADDRESS,
                            abi: TokenActionsAbi,
                            functionName: "transferERC20Action",
                            args: [
                                {
                                    operator: ParamOperator.EQUAL,
                                    value: Test_ERC20Address
                                },
                                {
                                    operator: ParamOperator.EQUAL,
                                    value: 10000n
                                },
                                {
                                    operator: ParamOperator.EQUAL,
                                    value: owner.address
                                }
                            ],
                            operation: Operation.DelegateCall
                        }
                    ]
                }
            }
        )

        const _sessionKeySmartAccountClient = await getKernelAccountClient({
            account: await getSessionKeyToSessionKeyKernelAccount(
                sessionKeyPlugin,
                {
                    address: zeroAddress,
                    selector: toFunctionSelector(
                        "executeDelegateCall(address, bytes)"
                    )
                }
            ),
            paymaster: zerodevPaymaster
        })

        const amountToTransfer = 10000n
        const transferData = encodeFunctionData({
            abi: TokenActionsAbi,
            functionName: "transferERC20Action",
            args: [Test_ERC20Address, amountToTransfer, owner.address]
        })

        const balanceOfReceipientBefore = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [owner.address]
        })
        const userOpHash =
            await _sessionKeySmartAccountClient.sendUserOperation({
                callData:
                    await _sessionKeySmartAccountClient.account.encodeCalls(
                        [
                            {
                                to: TOKEN_ACTION_ADDRESS,
                                data: transferData,
                                value: 0n
                            }
                        ],
                        "delegatecall"
                    )
            })
        console.log(
            "jiffyScanLink:",
            `https://jiffyscan.xyz/userOpHash/${userOpHash}?network=sepolia/`
        )
        const {
            receipt: { transactionHash: transferTransactionHash }
        } = await _sessionKeySmartAccountClient.waitForUserOperationReceipt({
            hash: userOpHash
        })

        console.log(
            "transferTransactionHash",
            `https://sepolia.etherscan.io/tx/${transferTransactionHash}`
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
})
