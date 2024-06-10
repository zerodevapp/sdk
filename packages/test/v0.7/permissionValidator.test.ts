// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import {
    EIP1271Abi,
    type KernelAccountClient,
    type KernelSmartAccount,
    KernelV3AccountAbi,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import { ethers } from "ethers"
import type { BundlerClient } from "permissionless"
import type { PimlicoBundlerClient } from "permissionless/clients/pimlico"
import type { EntryPoint } from "permissionless/types/entrypoint"
import {
    type Address,
    type Chain,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    type Transport,
    decodeEventLog,
    encodeFunctionData,
    getAbiItem,
    hashMessage,
    hashTypedData,
    parseEther,
    toFunctionSelector,
    zeroAddress
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
    ECDSA_SIGNER_CONTRACT,
    type Policy,
    SUDO_POLICY_CONTRACT,
    deserializePermissionAccount,
    serializePermissionAccount
} from "../../../plugins/permission"
import {
    toGasPolicy,
    toSignatureCallerPolicy,
    toSudoPolicy,
    toTimestampPolicy
} from "../../../plugins/permission/policies"
import { toCallPolicy } from "../../../plugins/permission/policies/toCallPolicy"
import { toRateLimitPolicy } from "../../../plugins/permission/policies/toRateLimitPolicy"
import { ParamCondition } from "../../../plugins/permission/policies/types"
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi"
import { TokenActionsAbi } from "../abis/TokenActionsAbi"
import { TOKEN_ACTION_ADDRESS, config } from "../config"
import { Test_ERC20Address } from "../utils"
import {
    getEntryPoint,
    getKernelAccountClient,
    getKernelBundlerClient,
    getPimlicoBundlerClient,
    getPublicClient,
    getSessionKeySignerToPermissionKernelAccount,
    getSignerToEcdsaKernelAccount,
    getSignerToPermissionKernelAccount,
    getSignerToPermissionKernelAccountAndPlugin,
    getSignerToRootPermissionKernelAccount,
    getSignerToRootPermissionWithSecondaryValidatorKernelAccount,
    getZeroDevPaymasterClient,
    sleep
} from "./utils"

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 144
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{142}$/
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
    let gasPolicy: Policy
    let permissionSmartAccountClient: KernelAccountClient<
        EntryPoint,
        Transport,
        Chain,
        KernelSmartAccount<EntryPoint>
    >

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
                sponsorUserOperation: async ({ userOperation }) => {
                    const zeroDevPaymaster = getZeroDevPaymasterClient()
                    return zeroDevPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint: getEntryPoint()
                    })
                }
            }
        })
        gasPolicy = await toGasPolicy({
            allowed: parseEther("10")
        })
        const sudoPolicy = await toSudoPolicy({})

        permissionSmartAccountClient = await getKernelAccountClient({
            account: await getSignerToRootPermissionKernelAccount([sudoPolicy]),
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
        "Should validate message signatures for undeployed accounts (6492)",
        async () => {
            const account = await getSignerToRootPermissionKernelAccount([
                gasPolicy
            ])
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

            const account = await getSignerToRootPermissionKernelAccount([
                gasPolicy
            ])
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
            const tx = await permissionSmartAccountClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log("tx", tx)

            const message = "hello world"
            const response = await permissionSmartAccountClient.signMessage({
                message
            })
            console.log("hashMessage(message)", hashMessage(message))
            console.log("response", response)
            const ambireResult = await verifyMessage({
                signer: permissionSmartAccountClient.account.address,
                message,
                signature: response,
                provider: new ethers.providers.JsonRpcProvider(
                    config["v0.7"].sepolia.rpcUrl
                )
            })
            expect(ambireResult).toBeTrue()

            const eip1271response = await publicClient.readContract({
                address: permissionSmartAccountClient.account.address,
                abi: EIP1271Abi,
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

            const response = await permissionSmartAccountClient.signTypedData({
                domain,
                primaryType,
                types,
                message
            })

            const eip1271response = await publicClient.readContract({
                address: permissionSmartAccountClient.account.address,
                abi: EIP1271Abi,
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
        "Smart account client install and uninstall PermissionValidator",
        async () => {
            const { accountWithSudo, accountWithSudoAndRegular, plugin } =
                await getSignerToPermissionKernelAccountAndPlugin([
                    await toSudoPolicy({})
                ])
            const permissionSmartAccountClient = await getKernelAccountClient({
                account: accountWithSudoAndRegular,
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
            console.log("Install Transaction hash:", response)
            const permissionSmartAccountClientSudo =
                await getKernelAccountClient({
                    account: accountWithSudo,
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

            const response2 =
                await permissionSmartAccountClientSudo.uninstallPlugin({
                    plugin
                })
            console.log("Uninstall Transaction hash:", response2)
            const transactionReceipt =
                await publicClient.waitForTransactionReceipt({
                    hash: response2
                })

            let policyAndSignerUninstalled = false
            for (const log of transactionReceipt.logs) {
                try {
                    const event = decodeEventLog({
                        abi: KernelV3AccountAbi,
                        ...log
                    })
                    if (event.eventName === "ModuleUninstallResult") {
                        if (
                            event.args.module === SUDO_POLICY_CONTRACT ||
                            event.args.module === ECDSA_SIGNER_CONTRACT
                        ) {
                            policyAndSignerUninstalled = true
                        } else {
                            policyAndSignerUninstalled = false
                        }
                    }
                    console.log(event)
                } catch (error) {}
            }
            expect(policyAndSignerUninstalled).toBeTrue()
            let errMsg = ""
            try {
                await permissionSmartAccountClient.sendUserOperation({
                    userOperation: {
                        callData:
                            await permissionSmartAccountClient.account.encodeCallData(
                                {
                                    to: zeroAddress,
                                    value: 0n,
                                    data: "0x"
                                }
                            )
                    }
                })
            } catch (error) {
                errMsg = error.message
            }
            expect(errMsg).toMatch(
                "UserOperation reverted during simulation with reason: 0x756688fe"
            )
        },
        TEST_TIMEOUT
    )

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
        "Smart account client send transaction with TimestampPolicy",
        async () => {
            const now = Math.floor(Date.now() / 1000)

            const timestampPolicy = await toTimestampPolicy({
                validAfter: now - 60,
                validUntil: now + 60
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([
                    timestampPolicy
                ]),
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
                    sponsorUserOperation: async ({ userOperation }) => {
                        const zeroDevPaymaster = getZeroDevPaymasterClient()
                        return zeroDevPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                }
            })

            await sleep(2 * 5000)

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

    test(
        "Smart account client send transaction with serialization/deserialization",
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

            const privateKey = generatePrivateKey()
            const signer = privateKeyToAccount(privateKey)

            const account = await getSessionKeySignerToPermissionKernelAccount(
                [callPolicy],
                signer
            )

            const serializedAccount = await serializePermissionAccount(
                account,
                privateKey
            )

            const deserilizedAccount = await deserializePermissionAccount(
                publicClient,
                getEntryPoint(),
                serializedAccount
            )

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: deserilizedAccount,
                middleware: {
                    gasPrice: async () =>
                        (await pimlicoBundlerClient.getUserOperationGasPrice())
                            .fast,
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

    test(
        "Smart account client send transaction with Action",
        async () => {
            const sudoPolicy = toSudoPolicy({})

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount(
                    [sudoPolicy],
                    {
                        address: TOKEN_ACTION_ADDRESS,
                        selector: toFunctionSelector(
                            getAbiItem({
                                abi: TokenActionsAbi,
                                name: "transferERC20Action"
                            })
                        )
                    }
                ),
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

            await mintToAccount(
                permissionSmartAccountClient.account.address,
                100000000n
            )

            const amountToTransfer = 10000n

            const transferData = encodeFunctionData({
                abi: TokenActionsAbi,
                functionName: "transferERC20Action",
                args: [Test_ERC20Address, amountToTransfer, owner.address]
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
                    to: permissionSmartAccountClient.account.address,
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
