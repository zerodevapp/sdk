// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import {
    EIP1271Abi,
    verifyEIP6492Signature,
    type KernelAccountClient,
    type KernelSmartAccount
} from "@zerodev/sdk"
import type { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types/entrypoint"
import {
    zeroAddress,
    type Chain,
    type Transport,
    hashMessage,
    type PublicClient,
    hashTypedData,
    decodeAbiParameters
} from "viem"
import { ethers } from "ethers"
import { verifyMessage } from "@ambire/signature-validator"
import {
    bundlerActions,
    isSmartAccountDeployed,
    type BundlerClient
} from "permissionless"
import {
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getSignerToEcdsaKernelAccount,
    getUndeployedYiSubAccount,
    getYiSubAccount,
    getZeroDevPaymasterClient
} from "./utils"
import type { YiSubAccount } from "../../../plugins/yiSubAccount"
import { config } from "../config"

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
        bundlerClient = kernelClient.extend(bundlerActions(getEntryPoint()))
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

    // test(
    //     "Client signMessage should return a valid signature",
    //     async () => {
    //         // to make sure kernel is deployed
    //         const userOpHash = await kernelClient.sendUserOperation({
    //             userOperation: {
    //                 callData: await account.encodeCallData({
    //                     to: zeroAddress,
    //                     data: "0x",
    //                     value: 0n
    //                 })
    //             }
    //         })
    //         const rcpt = await bundlerClient.waitForUserOperationReceipt({
    //             hash: userOpHash
    //         })
    //         console.log("tx", rcpt.receipt.transactionHash)

    //         const message = "hello world"
    //         const response = await account.signMessage({
    //             message
    //         })
    //         console.log("hashMessage(message)", hashMessage(message))
    //         console.log("response", response)
    //         const ambireResult = await verifyMessage({
    //             signer: account.address,
    //             message,
    //             signature: response,
    //             provider: new ethers.providers.JsonRpcProvider(
    //                 config["v0.7"].sepolia.rpcUrl
    //             )
    //         })
    //         expect(ambireResult).toBeTrue()

    //         const eip1271response = await publicClient.readContract({
    //             address: account.address,
    //             abi: EIP1271Abi,
    //             functionName: "isValidSignature",
    //             args: [hashMessage(message), response]
    //         })
    //         console.log("eip1271response", eip1271response)
    //         console.log("response", response)
    //         expect(eip1271response).toEqual("0x1626ba7e")
    //         expect(response).toBeString()
    //         expect(response).toHaveLength(SIGNATURE_LENGTH)
    //         expect(response).toMatch(SIGNATURE_REGEX)
    //     },
    //     TEST_TIMEOUT
    // )

    // test(
    //     "Smart account client signTypedData",
    //     async () => {
    //         const domain = {
    //             chainId: 1,
    //             name: "Test",
    //             verifyingContract: zeroAddress
    //         }

    //         const primaryType = "Test"

    //         const types = {
    //             Test: [
    //                 {
    //                     name: "test",
    //                     type: "string"
    //                 }
    //             ]
    //         }

    //         const message = {
    //             test: "hello world"
    //         }
    //         const typedHash = hashTypedData({
    //             domain,
    //             primaryType,
    //             types,
    //             message
    //         })

    //         const response = await account.signTypedData({
    //             domain,
    //             primaryType,
    //             types,
    //             message
    //         })

    //         const eip1271response = await publicClient.readContract({
    //             address: account.address,
    //             abi: EIP1271Abi,
    //             functionName: "isValidSignature",
    //             args: [typedHash, response]
    //         })
    //         expect(eip1271response).toEqual("0x1626ba7e")
    //         expect(response).toBeString()
    //         expect(response).toHaveLength(SIGNATURE_LENGTH)
    //         expect(response).toMatch(SIGNATURE_REGEX)
    //     },
    //     TEST_TIMEOUT
    // )

    // test(
    //     "Send tx subAccount through masterAccount",
    //     async () => {
    //         const userOpHash = await kernelClient.sendUserOperation({
    //             userOperation: {
    //                 callData: await account.encodeCallData({
    //                     to: zeroAddress,
    //                     data: "0x",
    //                     value: 0n
    //                 })
    //             }
    //         })
    //         console.log({ userOpHash })
    //         const rcpt = await bundlerClient.waitForUserOperationReceipt({
    //             hash: userOpHash
    //         })
    //         console.log(
    //             "transactionHash",
    //             `https://sepolia.etherscan.io/tx/${rcpt.receipt.transactionHash}`
    //         )
    //     },
    //     TEST_TIMEOUT
    // )
})
