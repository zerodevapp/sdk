// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import {
    EIP1271Abi,
    type KernelAccountClient,
    type KernelSmartAccount,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import { ethers } from "ethers"
import {
    type BundlerClient,
    bundlerActions,
    isSmartAccountDeployed
} from "permissionless"
import type { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types/entrypoint"
import {
    type Chain,
    type PublicClient,
    type Transport,
    encodeFunctionData,
    hashMessage,
    hashTypedData,
    zeroAddress
} from "viem"
import type { YiSubAccount } from "../../../plugins/yiSubAccount"
import type { YiSubAccountClient } from "../../../plugins/yiSubAccount/clients"
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi"
import { config } from "../config"
import { Test_ERC20Address } from "../utils"
import {
    getEntryPoint,
    getKernelAccountClient,
    getMultiTenantSessionAccount,
    getPublicClient,
    getSignerToEcdsaKernelAccount,
    getUndeployedYiSubAccount,
    getYiSubAccount,
    getYiSubAccountClient,
    getZeroDevPaymasterClient
} from "./utils"
import type { MultiTenantSessionAccount } from "../../../plugins/yiSubAccount"

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("Yi SubAccount", () => {
    let publicClient: PublicClient
    let masterAccount: KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    let account: YiSubAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    let bundlerClient: BundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE>
    let kernelClient: KernelAccountClient<
        ENTRYPOINT_ADDRESS_V07_TYPE,
        Transport,
        Chain,
        KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    >
    let yiSubAccountClient: YiSubAccountClient<
        ENTRYPOINT_ADDRESS_V07_TYPE,
        Transport,
        Chain,
        YiSubAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    >
    let multiTenantSessionAccount: MultiTenantSessionAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    let multiTenantSessionAccountClient: KernelAccountClient<
        ENTRYPOINT_ADDRESS_V07_TYPE,
        Transport,
        Chain,
        KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    >

    beforeAll(async () => {
        const ownerPrivateKey = process.env.TEST_PRIVATE_KEY
        if (!ownerPrivateKey) {
            throw new Error("TEST_PRIVATE_KEY is not set")
        }
        publicClient = await getPublicClient()
        masterAccount = await getSignerToEcdsaKernelAccount()
        account = await getYiSubAccount()
        kernelClient = await getKernelAccountClient({
            account: masterAccount,
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
        yiSubAccountClient = await getYiSubAccountClient({
            account: account,
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
        bundlerClient = kernelClient.extend(bundlerActions(getEntryPoint()))
        multiTenantSessionAccount = await getMultiTenantSessionAccount()
        multiTenantSessionAccountClient = await getKernelAccountClient({
            // @ts-ignore: fix return type error
            account: multiTenantSessionAccount,
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

    test("Sub Account address should be a valid Ethereum address", async () => {
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(account.address).not.toEqual(zeroAddress)
        console.log("account.address: ", account.address)
    })

    test(
        "Should validate message signatures for undeployed accounts (6492)",
        async () => {
            const account = await getUndeployedYiSubAccount(true)
            const message = "hello world"
            const signature = await account.signMessage({
                message
            })

            const isAccountDeployed = await isSmartAccountDeployed(
                publicClient,
                account.address
            )
            console.log(
                `Account ${account.address} is deployed: ${isAccountDeployed}`
            )

            expect(isAccountDeployed).toBeFalse()

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

            const account = await getUndeployedYiSubAccount(true)
            const isAccountDeployed = await isSmartAccountDeployed(
                publicClient,
                account.address
            )
            console.log(
                `Account ${account.address} is deployed: ${isAccountDeployed}`
            )

            expect(isAccountDeployed).toBeFalse()

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
            const txHash = await yiSubAccountClient.sendTransaction({
                to: zeroAddress,
                data: "0x",
                value: 0n
            })
            console.log("tx", txHash)

            const message = "hello world"
            const response = await account.signMessage({
                message
            })
            console.log("hashMessage(message)", hashMessage(message))
            console.log("response", response)
            const ambireResult = await verifyMessage({
                signer: account.address,
                message,
                signature: response,
                provider: new ethers.providers.JsonRpcProvider(
                    config["v0.7"].sepolia.rpcUrl
                )
            })
            expect(ambireResult).toBeTrue()

            const eip1271response = await publicClient.readContract({
                address: account.address,
                abi: EIP1271Abi,
                functionName: "isValidSignature",
                args: [hashMessage(message), response]
            })
            console.log("eip1271response", eip1271response)
            console.log("response", response)
            expect(eip1271response).toEqual("0x1626ba7e")
            expect(response).toBeString()
            // expect(response).toHaveLength(SIGNATURE_LENGTH)
            // expect(response).toMatch(SIGNATURE_REGEX)
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

            const response = await account.signTypedData({
                domain,
                primaryType,
                types,
                message
            })

            const eip1271response = await publicClient.readContract({
                address: account.address,
                abi: EIP1271Abi,
                functionName: "isValidSignature",
                args: [typedHash, response]
            })
            expect(eip1271response).toEqual("0x1626ba7e")
            expect(response).toBeString()
            // expect(response).toHaveLength(SIGNATURE_LENGTH)
            // expect(response).toMatch(SIGNATURE_REGEX)
        },
        TEST_TIMEOUT
    )

    test(
        "Send tx from subAccount through masterAccount",
        async () => {
            const userOpHash = await yiSubAccountClient.sendUserOperation({
                userOperation: {
                    callData: await account.encodeCallData({
                        to: zeroAddress,
                        data: "0x",
                        value: 0n
                    })
                }
            })
            const receipt = await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
            console.log(
                "transactionHash",
                `https://sepolia.etherscan.io/tx/${receipt.receipt.transactionHash}`
            )
        },
        TEST_TIMEOUT
    )

    test(
        "Spend token from parent through subaccount",
        async () => {
            const account = await getUndeployedYiSubAccount(true)
            const yiSubAccountClient = await getYiSubAccountClient({
                account: account,
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
            const isSubAccountDeployed = await isSmartAccountDeployed(
                publicClient,
                account.address
            )
            console.log(
                `Sub Account ${account.address} is deployed: ${isSubAccountDeployed}`
            )
            const isParentAccountDeployed = await isSmartAccountDeployed(
                publicClient,
                account.delegateAccount.address
            )
            console.log(
                `Parent Account ${account.delegateAccount.address} is deployed: ${isParentAccountDeployed}`
            )
            const transferAmount = 1337n
            console.log({
                masterAccountAddress: account.delegateAccount.address
            })
            console.log({ subAccountAddress: account.address })

            const mintTx = await kernelClient.sendTransaction({
                to: Test_ERC20Address,
                data: encodeFunctionData({
                    abi: TEST_ERC20Abi,
                    functionName: "mint",
                    args: [account.delegateAccount.address, 1000000n]
                }),
                value: 0n
            })
            console.log("mintTx", `https://sepolia.etherscan.io/tx/${mintTx}`)

            const mainCalldata: Parameters<
                YiSubAccount<ENTRYPOINT_ADDRESS_V07_TYPE>["encodeCallData"]
            >[0] = {
                to: Test_ERC20Address,
                data: encodeFunctionData({
                    abi: TEST_ERC20Abi,
                    functionName: "transfer",
                    args: [
                        "0xA02CDdFa44B8C01b4257F54ac1c43F75801E8175",
                        transferAmount
                    ]
                }),
                value: 0n
            }
            const txHash = await yiSubAccountClient.sendTransaction(
                mainCalldata
            )
            console.log(
                "transactionHash",
                `https://sepolia.etherscan.io/tx/${txHash}`
            )
        },
        TEST_TIMEOUT
    )

    test(
        "Send tx from subAccount through multiTenantSessionAccount",
        async () => {
            const userOpHash =
                await multiTenantSessionAccountClient.sendUserOperation({
                    userOperation: {
                        callData:
                            await multiTenantSessionAccount.encodeCallData({
                                to: zeroAddress,
                                data: "0x",
                                value: 0n
                            })
                    }
                })
            const receipt = await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
            console.log(
                "transactionHash",
                `https://sepolia.etherscan.io/tx/${receipt.receipt.transactionHash}`
            )
        },
        TEST_TIMEOUT
    )
})
