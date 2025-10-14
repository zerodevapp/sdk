// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { toECDSASigner } from "@zerodev/permissions/signers"
import {
    EIP1271Abi,
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    KernelV3AccountAbi,
    type ZeroDevPaymasterClient,
    createKernelAccount,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import { ethers } from "ethers"
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
    hexToBytes,
    pad,
    parseAbi,
    parseEther,
    toFunctionSelector,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import {
    ECDSA_SIGNER_CONTRACT,
    GAS_POLICY_CONTRACT,
    type Policy,
    RATE_LIMIT_POLICY_WITH_RESET_CONTRACT,
    SUDO_POLICY_CONTRACT,
    deserializePermissionAccount,
    serializePermissionAccount,
    toPermissionValidator
} from "../../../plugins/permission"
import {
    CallPolicyVersion,
    toCallPolicy,
    toGasPolicy,
    toRateLimitPolicy,
    toSignatureCallerPolicy,
    toSudoPolicy,
    toTimestampPolicy
} from "../../../plugins/permission/policies"
import {
    CallType,
    ParamCondition
} from "../../../plugins/permission/policies/types"
import type { Permission } from "../../../plugins/permission/policies/types"
import { toInitConfig } from "../../../plugins/permission/toInitConfig"
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi"
import { TokenActionsAbi } from "../abis/TokenActionsAbi"
import { TOKEN_ACTION_ADDRESS, config } from "../config"
import {
    Test_ERC20Address,
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getSessionKeySignerToPermissionKernelAccount,
    getSignerToEcdsaKernelAccount,
    getSignerToPermissionKernelAccount,
    getSignerToPermissionKernelAccountAndPlugin,
    getSignerToRootPermissionKernelAccount,
    getSignerToRootPermissionWithSecondaryValidatorKernelAccount,
    getTestingChain,
    getZeroDevPaymasterClient,
    kernelVersion,
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
    let ecdsaSmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >
    let owner: PrivateKeyAccount
    let gasPolicy: Policy
    let permissionSmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >
    let zeroDevPaymaster: ZeroDevPaymasterClient

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

        const ecdsaAccount = await getSignerToEcdsaKernelAccount()

        zeroDevPaymaster = getZeroDevPaymasterClient()
        ecdsaSmartAccountClient = await getKernelAccountClient({
            account: ecdsaAccount,
            paymaster: zeroDevPaymaster
        })
        gasPolicy = await toGasPolicy({
            allowed: parseEther("10"),
            policyAddress: GAS_POLICY_CONTRACT
        })
        const sudoPolicy = await toSudoPolicy({
            policyAddress: SUDO_POLICY_CONTRACT
        })

        permissionSmartAccountClient = await getKernelAccountClient({
            account: await getSignerToRootPermissionKernelAccount([sudoPolicy]),
            paymaster: zeroDevPaymaster
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
        "Should install PermissionValidator as initConfig",
        async () => {
            const publicClient = await getPublicClient()
            const signer = privateKeyToAccount(generatePrivateKey())
            const ecdsaValidatorPlugin = await signerToEcdsaValidator(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer,
                    kernelVersion
                }
            )

            const sessionKeySigner = privateKeyToAccount(generatePrivateKey())
            const ecdsaModularSigner = await toECDSASigner({
                signer: sessionKeySigner
            })

            const permissionPlugin = await toPermissionValidator(publicClient, {
                entryPoint: getEntryPoint(),
                signer: ecdsaModularSigner,
                kernelVersion,
                policies: [toSudoPolicy({})]
            })

            const account = await createKernelAccount(publicClient, {
                entryPoint: getEntryPoint(),
                plugins: {
                    sudo: ecdsaValidatorPlugin
                },
                kernelVersion,
                initConfig: await toInitConfig(permissionPlugin)
            })

            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account,
                paymaster: zeroDevPaymaster
            })

            const tx = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })

            console.log(
                `${getTestingChain().blockExplorers?.default.url}/tx/${tx}`
            )

            const permissionAccount = await createKernelAccount(publicClient, {
                entryPoint: getEntryPoint(),
                plugins: {
                    regular: permissionPlugin
                },
                kernelVersion,
                address: account.address
            })

            const permissionKernelClient = await getKernelAccountClient({
                account: permissionAccount,
                paymaster: zeroDevPaymaster
            })

            const tx2 = await permissionKernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })

            console.log(
                `${getTestingChain().blockExplorers?.default.url}/tx/${tx2}`
            )
        },
        TEST_TIMEOUT
    )

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
                    config["0.7"][sepolia.id].rpcUrl
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
                    config["0.7"][sepolia.id].rpcUrl
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
                    config["0.7"][sepolia.id].rpcUrl
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
                paymaster: zeroDevPaymaster
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
                    paymaster: zeroDevPaymaster
                })

            const response2UOHash =
                await permissionSmartAccountClientSudo.uninstallPlugin({
                    plugin
                })
            const response2 =
                await permissionSmartAccountClientSudo.waitForUserOperationReceipt(
                    {
                        hash: response2UOHash
                    }
                )
            console.log(
                "Uninstall Transaction hash:",
                response2.receipt.transactionHash
            )
            const transactionReceipt =
                await publicClient.waitForTransactionReceipt({
                    hash: response2.receipt.transactionHash
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
                    callData:
                        await permissionSmartAccountClient.account.encodeCalls([
                            {
                                to: zeroAddress,
                                value: 0n,
                                data: "0x"
                            }
                        ])
                })
            } catch (error) {
                errMsg = error.message
            }
            expect(errMsg).toMatch(/AA23 reverted 0x(756688fe|c48cf8ee)/)
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client revoke permissionValidator with invalidate nonce",
        async () => {
            const {
                accountWithSudo,
                accountWithSudoAndRegular,
                accountWithRegular
            } = await getSignerToPermissionKernelAccountAndPlugin([
                await toSudoPolicy({})
            ])

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: accountWithSudoAndRegular,
                paymaster: zeroDevPaymaster
            })
            const permissionSmartAccountClientWithRegular =
                await getKernelAccountClient({
                    account: accountWithRegular,
                    paymaster: zeroDevPaymaster
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
                    paymaster: zeroDevPaymaster
                })

            const currentNonce =
                await permissionSmartAccountClientSudo.getKernelV3ModuleCurrentNonce()
            console.log({ currentNonce })

            const response2UOHash =
                await permissionSmartAccountClientSudo.invalidateNonce({
                    nonceToSet: currentNonce + 1
                })
            const response2 =
                await permissionSmartAccountClientSudo.waitForUserOperationReceipt(
                    {
                        hash: response2UOHash
                    }
                )
            console.log(
                "Invalidate nonce transaction hash:",
                response2.receipt.transactionHash
            )

            let errMsg = ""
            try {
                await permissionSmartAccountClientWithRegular.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            } catch (error) {
                errMsg = error.message
            }
            console.log(errMsg)
            expect(errMsg).toMatch(/AA23 reverted 0x(756688fe|c48cf8ee)/)
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
                paymaster: zeroDevPaymaster
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
                paymaster: zeroDevPaymaster
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
                paymaster: zeroDevPaymaster
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
                paymaster: zeroDevPaymaster
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
                paymaster: zeroDevPaymaster
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
                paymaster: zeroDevPaymaster
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
        "Smart account client send transaction with RateLimitPolicy with reset",
        async () => {
            const startAt = Math.floor(Date.now() / 1000)

            const rateLimitPolicy = await toRateLimitPolicy({
                policyAddress: RATE_LIMIT_POLICY_WITH_RESET_CONTRACT,
                interval: 100,
                count: 2
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([
                    rateLimitPolicy
                ]),
                paymaster: zeroDevPaymaster
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
        "Smart account client send transaction with CallPolicy V0.0.1",
        async () => {
            const callPolicy = await toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_1,
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
                    },
                    {
                        target: owner.address,
                        valueLimit: 100000000n
                    }
                ]
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([callPolicy]),
                paymaster: zeroDevPaymaster
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
        "Smart account client send transaction with CallPolicy V0.0.2",
        async () => {
            const callPolicy = await toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_2,
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
                paymaster: zeroDevPaymaster
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
        "Smart account client send transaction with CallPolicy V0.0.2 using ONE_OF condition",
        async () => {
            const randomAccount = privateKeyToAccount(generatePrivateKey())
            const randomAddress = randomAccount.address
            const callPolicy = await toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_2,
                permissions: [
                    {
                        abi: TEST_ERC20Abi,
                        target: Test_ERC20Address,
                        functionName: "transfer",
                        args: [
                            {
                                condition: ParamCondition.ONE_OF,
                                value: [owner.address, randomAddress]
                            },
                            null
                        ]
                    }
                ]
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([callPolicy]),
                paymaster: zeroDevPaymaster
            })

            await mintToAccount(
                permissionSmartAccountClient.account.address,
                100000000n
            )

            const amountToTransfer = 10000n
            const transferData = encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [randomAddress, amountToTransfer]
            })

            const balanceOfReceipientBefore = await publicClient.readContract({
                abi: TEST_ERC20Abi,
                address: Test_ERC20Address,
                functionName: "balanceOf",
                args: [randomAddress]
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
                args: [randomAddress]
            })

            console.log("balanceOfReceipientAfter", balanceOfReceipientAfter)

            expect(balanceOfReceipientAfter).toBe(
                balanceOfReceipientBefore + amountToTransfer
            )
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send transaction with CallPolicy V0.0.2 using zeroAddress as target",
        async () => {
            const randomAccount = privateKeyToAccount(generatePrivateKey())
            const randomAddress = randomAccount.address
            const callPolicy = await toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_2,
                permissions: [
                    {
                        abi: TEST_ERC20Abi,
                        target: zeroAddress,
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
                paymaster: zeroDevPaymaster
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
        "Smart account client send transaction with CallPolicy V0.0.4",
        async () => {
            const callPolicy = await toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_4,
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
                paymaster: zeroDevPaymaster
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
        "Smart account client send transaction with CallPolicy V0.0.5",
        async () => {
            const callPolicy = toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_5,
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
                paymaster: zeroDevPaymaster
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
        "Smart account client send transaction with SLICE_EQUAL condition with bytes",
        async () => {
            const testAbi = parseAbi(["function test(bytes data) public"])

            const callPolicy = toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_5,
                permissions: [
                    {
                        abi: testAbi,
                        target: zeroAddress,
                        functionName: "test",
                        args: [
                            {
                                condition: ParamCondition.SLICE_EQUAL,
                                value: "0xff",
                                start: 1,
                                length: 1
                            }
                        ]
                    }
                ]
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([callPolicy]),
                paymaster: zeroDevPaymaster
            })

            const callData = encodeFunctionData({
                abi: testAbi,
                functionName: "test",
                args: ["0x00ff"]
            })

            const response = await permissionSmartAccountClient.sendTransaction(
                {
                    to: zeroAddress,
                    data: callData
                }
            )

            console.log("Transaction hash:", response)
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send transaction with SLICE_EQUAL condition with string",
        async () => {
            const testAbi = parseAbi([
                "function test(string calldata data) public"
            ])

            const callPolicy = toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_5,
                permissions: [
                    {
                        abi: testAbi,
                        target: zeroAddress,
                        functionName: "test",
                        args: [
                            {
                                condition: ParamCondition.SLICE_EQUAL,
                                value: "kernel",
                                start: 2,
                                length: 6
                            }
                        ]
                    }
                ]
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([callPolicy]),
                paymaster: zeroDevPaymaster
            })

            const callData = encodeFunctionData({
                abi: testAbi,
                functionName: "test",
                args: ["0xkernel"]
            })

            const response = await permissionSmartAccountClient.sendTransaction(
                {
                    to: zeroAddress,
                    data: callData
                }
            )

            console.log("Transaction hash:", response)
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send transaction with SLICE_EQUAL condition with hex string",
        async () => {
            const testAbi = parseAbi([
                "function test(string calldata data) public"
            ])

            const callPolicy = toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_5,
                permissions: [
                    {
                        abi: testAbi,
                        target: zeroAddress,
                        functionName: "test",
                        args: [
                            {
                                condition: ParamCondition.SLICE_EQUAL,
                                value: "0xffff",
                                start: 0,
                                length: 6
                            }
                        ]
                    }
                ]
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([callPolicy]),
                paymaster: zeroDevPaymaster
            })

            const callData = encodeFunctionData({
                abi: testAbi,
                functionName: "test",
                args: ["0xffff00"]
            })

            const response = await permissionSmartAccountClient.sendTransaction(
                {
                    to: zeroAddress,
                    data: callData
                }
            )

            console.log("Transaction hash:", response)
        },
        TEST_TIMEOUT
    )

    test(
        "should fail with Smart account client send transaction with SLICE_EQUAL condition",
        async () => {
            const testAbi = parseAbi(["function test(bytes data) public"])

            const callPolicy = toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_5,
                permissions: [
                    {
                        abi: testAbi,
                        target: zeroAddress,
                        functionName: "test",
                        args: [
                            {
                                condition: ParamCondition.SLICE_EQUAL,
                                value: "0xff",
                                start: 1,
                                length: 1
                            }
                        ]
                    }
                ]
            })

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: await getSignerToPermissionKernelAccount([callPolicy]),
                paymaster: zeroDevPaymaster
            })

            const invalidCallData = encodeFunctionData({
                abi: testAbi,
                functionName: "test",
                args: ["0x00ee"]
            })

            await expect(
                permissionSmartAccountClient.sendTransaction({
                    to: zeroAddress,
                    data: invalidCallData
                })
            ).rejects.toThrow()
        },
        TEST_TIMEOUT
    )

    test(
        "should fail with SLICE_EQUAL condition, start and length not provided",
        async () => {
            const testAbi = parseAbi(["function test(bytes data) public"])

            expect(() =>
                toCallPolicy({
                    policyVersion: CallPolicyVersion.V0_0_5,
                    permissions: [
                        {
                            abi: testAbi,
                            target: zeroAddress,
                            functionName: "test",
                            args: [
                                {
                                    condition: ParamCondition.SLICE_EQUAL,
                                    value: "0xff"
                                }
                            ]
                        }
                    ]
                })
            ).toThrow("start and length are required for SLICE_EQUAL condition")
        },
        TEST_TIMEOUT
    )

    test(
        "should fail with SLICE_EQUAL condition, value is not equal to the given length",
        async () => {
            const testAbi = parseAbi(["function test(bytes data) public"])

            expect(() =>
                toCallPolicy({
                    policyVersion: CallPolicyVersion.V0_0_5,
                    permissions: [
                        {
                            abi: testAbi,
                            target: zeroAddress,
                            functionName: "test",
                            args: [
                                {
                                    condition: ParamCondition.SLICE_EQUAL,
                                    value: "0x00ff",
                                    start: 1,
                                    length: 1
                                }
                            ]
                        }
                    ]
                })
            ).toThrow("Value length is not equal to the given length")
        },
        TEST_TIMEOUT
    )

    test(
        "should fail with SLICE_EQUAL condition, value is too short",
        async () => {
            const testAbi = parseAbi(["function test(bytes data) public"])

            expect(() =>
                toCallPolicy({
                    policyVersion: CallPolicyVersion.V0_0_5,
                    permissions: [
                        {
                            abi: testAbi,
                            target: zeroAddress,
                            functionName: "test",
                            args: [
                                {
                                    condition: ParamCondition.SLICE_EQUAL,
                                    value: "0xffff",
                                    start: 1,
                                    length: 2
                                }
                            ]
                        }
                    ]
                })
            ).toThrow("Value is too short for the given start and length")
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send transaction with serialization/deserialization",
        async () => {
            const callPolicy = await toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_2,
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
                kernelVersion,
                serializedAccount
            )

            const permissionSmartAccountClient = await getKernelAccountClient({
                account: deserilizedAccount,
                paymaster: zeroDevPaymaster
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
                paymaster: zeroDevPaymaster
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

    // TypeScript tests for Permission type changes
    describe("Permission Type TypeScript Tests", () => {
        test("should allow ABI-based permission with both abi and functionName", () => {
            // ✅ This should compile - both abi and functionName are provided
            const validAbiPermission: Permission<
                typeof TEST_ERC20Abi,
                "transfer"
            > = {
                target: Test_ERC20Address,
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [
                    {
                        condition: ParamCondition.EQUAL,
                        value: owner.address
                    },
                    null
                ]
            }

            expect(validAbiPermission.target).toBe(Test_ERC20Address)
            expect(validAbiPermission.abi).toBe(TEST_ERC20Abi)
            expect(validAbiPermission.functionName).toBe("transfer")
        })

        test("should allow manual permission with selector", () => {
            // ✅ This should compile - manual permission with selector
            const manualPermission: Permission<
                typeof TEST_ERC20Abi,
                "transfer"
            > = {
                target: Test_ERC20Address,
                selector: "0xa9059cbb" // transfer function selector
            }

            expect(manualPermission.target).toBe(Test_ERC20Address)
            expect(manualPermission.selector).toBe("0xa9059cbb")
        })

        test("should allow manual permission with selector and rules", () => {
            // ✅ This should compile - manual permission with selector and rules
            const manualPermissionWithRules: Permission<
                typeof TEST_ERC20Abi,
                "transfer"
            > = {
                target: Test_ERC20Address,
                selector: "0xa9059cbb",
                rules: [
                    {
                        condition: ParamCondition.EQUAL,
                        offset: 0,
                        params: "0x123456"
                    }
                ]
            }

            expect(manualPermissionWithRules.target).toBe(Test_ERC20Address)
            expect(manualPermissionWithRules.selector).toBe("0xa9059cbb")
            expect(manualPermissionWithRules.rules).toHaveLength(1)
        })

        test("TypeScript should prevent invalid permission configurations", () => {
            // These tests verify that TypeScript would catch invalid configurations
            // at compile time. Since we can't test compilation failures in runtime tests,
            // we document the expected TypeScript behavior here:

            /* 
            ❌ These would fail TypeScript compilation:

            // Missing required 'abi' when using functionName
            const invalidPermission1: Permission<typeof TEST_ERC20Abi, "transfer"> = {
                target: Test_ERC20Address,
                functionName: "transfer"  // ❌ Missing required 'abi'
            }

            // Missing required 'functionName' when using abi
            const invalidPermission2: Permission<typeof TEST_ERC20Abi, "transfer"> = {
                target: Test_ERC20Address,
                abi: TEST_ERC20Abi  // ❌ Missing required 'functionName'
            }

            // Cannot use functionName without abi
            const invalidPermission4: Permission<any, any> = {
                target: Test_ERC20Address,
                functionName: "transfer",  // ❌ Can't use functionName without abi
                selector: "0xa9059cbb"
            }
            */

            // This test just documents the expected behavior
            expect(true).toBe(true)
        })

        test("should work with CallPolicy for both permission types", async () => {
            // Test that both permission types work correctly with toCallPolicy
            const callPolicyWithAbi = await toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_4,
                permissions: [
                    {
                        target: Test_ERC20Address,
                        abi: TEST_ERC20Abi,
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

            const callPolicyWithManual = await toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_4,
                permissions: [
                    {
                        target: Test_ERC20Address,
                        selector: "0xa9059cbb"
                    }
                ]
            })

            expect(callPolicyWithAbi.policyParams.type).toBe("call")
            expect(callPolicyWithManual.policyParams.type).toBe("call")
        })

        test("should support different ERC20 functions with typed args", () => {
            // ✅ Transfer function
            const transferPermission: Permission<
                typeof TEST_ERC20Abi,
                "transfer"
            > = {
                target: Test_ERC20Address,
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [
                    {
                        condition: ParamCondition.EQUAL,
                        value: owner.address
                    },
                    {
                        condition: ParamCondition.LESS_THAN,
                        value: 1000n
                    }
                ]
            }

            // ✅ Approve function
            const approvePermission: Permission<
                typeof TEST_ERC20Abi,
                "approve"
            > = {
                target: Test_ERC20Address,
                abi: TEST_ERC20Abi,
                functionName: "approve",
                args: [
                    {
                        condition: ParamCondition.EQUAL,
                        value: owner.address
                    },
                    {
                        condition: ParamCondition.LESS_THAN_OR_EQUAL,
                        value: 500n
                    }
                ]
            }

            // ✅ View function (balanceOf)
            const balanceOfPermission: Permission<
                typeof TEST_ERC20Abi,
                "balanceOf"
            > = {
                target: Test_ERC20Address,
                abi: TEST_ERC20Abi,
                functionName: "balanceOf",
                args: [
                    {
                        condition: ParamCondition.EQUAL,
                        value: owner.address
                    }
                ]
            }

            expect(transferPermission.functionName).toBe("transfer")
            expect(approvePermission.functionName).toBe("approve")
            expect(balanceOfPermission.functionName).toBe("balanceOf")
        })

        test("should support ParamCondition.ONE_OF with typed arrays", () => {
            const multiRecipientPermission: Permission<
                typeof TEST_ERC20Abi,
                "transfer"
            > = {
                target: Test_ERC20Address,
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [
                    {
                        condition: ParamCondition.ONE_OF,
                        value: [owner.address, zeroAddress] // Array of addresses
                    },
                    null
                ]
            }

            expect(multiRecipientPermission.args?.[0]).toEqual({
                condition: ParamCondition.ONE_OF,
                value: [owner.address, zeroAddress]
            })
        })

        test("should support optional fields in both permission types", () => {
            // ABI permission with optional fields
            const abiPermissionWithOptions: Permission<
                typeof TEST_ERC20Abi,
                "transfer"
            > = {
                target: Test_ERC20Address,
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                callType: CallType.CALL,
                valueLimit: 100n,
                args: [null, null] // No argument validation
            }

            // Manual permission with optional fields
            const manualPermissionWithOptions: Permission<
                typeof TEST_ERC20Abi,
                "transfer"
            > = {
                target: Test_ERC20Address,
                selector: "0xa9059cbb",
                callType: CallType.DELEGATE_CALL,
                valueLimit: 200n,
                rules: []
            }

            expect(abiPermissionWithOptions.callType).toBe(CallType.CALL)
            expect(abiPermissionWithOptions.valueLimit).toBe(100n)
            expect(manualPermissionWithOptions.callType).toBe(
                CallType.DELEGATE_CALL
            )
            expect(manualPermissionWithOptions.valueLimit).toBe(200n)
        })

        test("should throw error for function overloads when multiple functions have the same name", async () => {
            // Create an ABI with function overloads (common in ERC721)
            const abiWithOverloads = [
                {
                    type: "function",
                    name: "safeTransferFrom",
                    inputs: [
                        { name: "from", type: "address" },
                        { name: "to", type: "address" },
                        { name: "tokenId", type: "uint256" }
                    ],
                    outputs: [],
                    stateMutability: "nonpayable"
                },
                {
                    type: "function",
                    name: "safeTransferFrom",
                    inputs: [
                        { name: "from", type: "address" },
                        { name: "to", type: "address" },
                        { name: "tokenId", type: "uint256" },
                        { name: "data", type: "bytes" }
                    ],
                    outputs: [],
                    stateMutability: "nonpayable"
                }
            ] as const

            // This should throw an error when used with toCallPolicy without selector
            await expect(async () => {
                await toCallPolicy({
                    policyVersion: CallPolicyVersion.V0_0_4,
                    permissions: [
                        {
                            target: Test_ERC20Address,
                            abi: abiWithOverloads,
                            functionName: "safeTransferFrom" as const,
                            args: [null, null, null] // Allow any values for the first overload
                        }
                    ]
                })
            }).toThrow(
                /Multiple function overloads found for "safeTransferFrom"/
            )
        })

        test("should resolve function overloads when selector is provided", async () => {
            // Create an ABI with function overloads (common in ERC721)
            const abiWithOverloads = [
                {
                    type: "function",
                    name: "safeTransferFrom",
                    inputs: [
                        { name: "from", type: "address" },
                        { name: "to", type: "address" },
                        { name: "tokenId", type: "uint256" }
                    ],
                    outputs: [],
                    stateMutability: "nonpayable"
                },
                {
                    type: "function",
                    name: "safeTransferFrom",
                    inputs: [
                        { name: "from", type: "address" },
                        { name: "to", type: "address" },
                        { name: "tokenId", type: "uint256" },
                        { name: "data", type: "bytes" }
                    ],
                    outputs: [],
                    stateMutability: "nonpayable"
                }
            ] as const

            // Get the selector for the first overload (3 parameters)
            const firstOverloadSelector = toFunctionSelector(
                abiWithOverloads[0]
            )

            // This should work when selector is provided
            const callPolicyWithSelector = await toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_4,
                permissions: [
                    {
                        target: Test_ERC20Address,
                        abi: abiWithOverloads,
                        functionName: "safeTransferFrom" as const,
                        selector: firstOverloadSelector,
                        args: [null, null, null] // Allow any values for the first overload
                    }
                ]
            })

            // Verify the policy was created successfully
            expect(callPolicyWithSelector.policyParams.type).toBe("call")
            if (callPolicyWithSelector.policyParams.type === "call") {
                expect(
                    callPolicyWithSelector.policyParams.permissions
                ).toHaveLength(1)
                expect(
                    callPolicyWithSelector.policyParams.permissions?.[0]
                        ?.selector
                ).toBe(firstOverloadSelector)
            }
        })

        test("should work normally when there are no function overloads", async () => {
            // Use the regular ERC20 ABI with unique function names
            const callPolicyWithoutOverloads = await toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_4,
                permissions: [
                    {
                        target: Test_ERC20Address,
                        abi: TEST_ERC20Abi,
                        functionName: "transfer",
                        args: [null, null]
                    }
                ]
            })

            // Verify the policy was created successfully
            expect(callPolicyWithoutOverloads.policyParams.type).toBe("call")
            if (callPolicyWithoutOverloads.policyParams.type === "call") {
                expect(
                    callPolicyWithoutOverloads.policyParams.permissions
                ).toHaveLength(1)
            }
        })
    })
})

//         preVerificationGas: 84700n,
//         callGasLimit: 1273781n,
//         verificationGasLimit: 726789n
