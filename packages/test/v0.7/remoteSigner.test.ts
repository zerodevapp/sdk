// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import {
    EIP1271Abi,
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    type ZeroDevPaymasterClient,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import { ethers } from "ethers"
import {
    type Address,
    type Chain,
    type PublicClient,
    type Transport,
    hashMessage,
    hashTypedData,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { sepolia } from "viem/chains"
import { toSudoPolicy } from "../../../plugins/permission/policies"
import {
    RemoteSignerMode,
    toRemoteSigner
} from "../../../plugins/remoteSigner/toRemoteSigner"
import { config } from "../config"
import {
    findUserOperationEvent,
    getEcdsaKernelAccountWithRemoteSigner,
    getEntryPoint,
    getKernelAccountClient,
    getPermissionKernelAccountWithRemoteSigner,
    getPublicClient,
    getZeroDevPaymasterClient
} from "./utils"

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 144
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{142}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

// outdated testing
describe.skip("Remote Signer", () => {
    let remoteSignerAddress: Address
    let publicClient: PublicClient
    let ecdsaSmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >
    let permissionSmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >
    let zeroDevPaymaster: ZeroDevPaymasterClient

    beforeAll(async () => {
        publicClient = await getPublicClient()

        const remoteSigner = await toRemoteSigner({
            apiKey: process.env.ZERODEV_API_KEY as string,
            mode: RemoteSignerMode.Create
        })

        remoteSignerAddress = remoteSigner.address
        console.log("remoteSignerAddress", remoteSignerAddress)

        const ecdsaAccount =
            await getEcdsaKernelAccountWithRemoteSigner(remoteSigner)
        zeroDevPaymaster = getZeroDevPaymasterClient()
        ecdsaSmartAccountClient = await getKernelAccountClient({
            account: ecdsaAccount,
            paymaster: zeroDevPaymaster
        })
        const sudoPolicy = await toSudoPolicy({})

        permissionSmartAccountClient = await getKernelAccountClient({
            account: await getPermissionKernelAccountWithRemoteSigner(
                remoteSigner,
                [sudoPolicy]
            ),
            paymaster: zeroDevPaymaster
        })
    })

    test(
        "Account address should be a valid Ethereum address",
        async () => {
            const account = ecdsaSmartAccountClient.account
            console.log("Account address:", account.address)
            expect(account.address).toBeString()
            expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
            expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
            expect(account.address).not.toEqual(zeroAddress)
        },
        TEST_TIMEOUT
    )

    test(
        "Should validate message signatures for undeployed accounts (6492)",
        async () => {
            const remoteSigner = await toRemoteSigner({
                apiKey: process.env.ZERODEV_API_KEY as string,
                keyAddress: remoteSignerAddress,
                mode: RemoteSignerMode.Get
            })

            const account =
                await getEcdsaKernelAccountWithRemoteSigner(remoteSigner)
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

            const remoteSigner = await toRemoteSigner({
                apiKey: process.env.ZERODEV_API_KEY as string,
                keyAddress: remoteSignerAddress,
                mode: RemoteSignerMode.Get
            })

            const sudoPolicy = await toSudoPolicy({})

            const account = await getPermissionKernelAccountWithRemoteSigner(
                remoteSigner,
                [sudoPolicy]
            )
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
        "ECDSA account client can send tx",
        async () => {
            const txHash = await ecdsaSmartAccountClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log("txHash", txHash)

            expect(txHash).toBeString()
            expect(txHash).toHaveLength(TX_HASH_LENGTH)
            expect(txHash).toMatch(TX_HASH_REGEX)

            const transactionReceipt =
                await publicClient.waitForTransactionReceipt({
                    hash: txHash
                })

            expect(findUserOperationEvent(transactionReceipt.logs)).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Permission account client can send tx",
        async () => {
            const txHash = await permissionSmartAccountClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log("txHash", txHash)

            expect(txHash).toBeString()
            expect(txHash).toHaveLength(TX_HASH_LENGTH)
            expect(txHash).toMatch(TX_HASH_REGEX)

            const transactionReceipt =
                await publicClient.waitForTransactionReceipt({
                    hash: txHash
                })

            expect(findUserOperationEvent(transactionReceipt.logs)).toBeTrue()
        },
        TEST_TIMEOUT
    )
})
