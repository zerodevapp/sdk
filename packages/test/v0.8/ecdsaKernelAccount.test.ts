import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import { getKernelAddressFromECDSA } from "@zerodev/ecdsa-validator"
import {
    constants,
    EIP1271Abi,
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import dotenv from "dotenv"
import { ethers } from "ethers"
import {
    type Address,
    type Chain,
    type GetContractReturnType,
    type Hex,
    type PublicClient,
    type Transport,
    hashTypedData,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { type PrivateKeyAccount, privateKeyToAccount } from "viem/accounts"
import { arbitrumSepolia, sepolia } from "viem/chains"
import { hashMessage } from "viem/experimental/erc7739"
import type { GreeterAbi } from "../abis/Greeter.js"
import { config } from "../config.js"
import { validateEnvironmentVariables } from "../v0.7/utils/common.js"
import {
    defaultChainId,
    defaultIndex,
    getEntryPoint,
    getPublicClient,
    getZeroDevPaymasterClient
} from "./utils/common.js"
import {
    getEcdsaKernelAccountWithRandomSigner,
    getKernelAccountClient,
    getSignerToEcdsaKernelAccount
} from "./utils/ecdsaUtils.js"

dotenv.config()

const requiredEnvVars = [
    "FACTORY_ADDRESS",
    "TEST_PRIVATE_KEY",
    "RPC_URL",
    "ENTRYPOINT_ADDRESS",
    "GREETER_ADDRESS",
    "ZERODEV_V3_PROJECT_ID",
    "RPC_URL_ARB_SEPOLIA"
]

validateEnvironmentVariables(requiredEnvVars)

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("ECDSA kernel Account v0.8", () => {
    let account: SmartAccount<KernelSmartAccountImplementation<"0.8">>
    let ownerAccount: PrivateKeyAccount
    let publicClient: PublicClient
    let kernelClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation<"0.8">>
    >
    let greeterContract: GetContractReturnType<
        typeof GreeterAbi,
        typeof kernelClient,
        Address
    >
    let owner: Address

    beforeAll(async () => {
        const ownerPrivateKey = process.env.TEST_PRIVATE_KEY as Hex
        ownerAccount = privateKeyToAccount(ownerPrivateKey)
        account = await getSignerToEcdsaKernelAccount()
        owner = privateKeyToAccount(ownerPrivateKey).address
        publicClient = await getPublicClient()
        kernelClient = await getKernelAccountClient({
            account
        })
    })

    test("account address should be a valid Ethereum address", async () => {
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(account.address).not.toEqual(zeroAddress)
    })

    test("getKernelAddressFromECDSA util should return valid account address", async () => {
        const kernelVersion = account.kernelVersion

        const generatedAccountAddress = await getKernelAddressFromECDSA({
            entryPoint: getEntryPoint(),
            kernelVersion,
            eoaAddress: ownerAccount.address,
            index: defaultIndex,
            initCodeHash:
                constants.KernelVersionToAddressesMap[kernelVersion]
                    .initCodeHash ?? "0x"
        })
        expect(account.address).toEqual(generatedAccountAddress)
    })

    test(
        "should validate message signatures for undeployed accounts (6492)",
        async () => {
            const account = await getEcdsaKernelAccountWithRandomSigner()
            const chainId = account.client.chain?.id ?? defaultChainId
            const message = "hello world"
            const signature = await account.signMessage({
                message
            })
            const hashedMessage = hashMessage({
                message,
                verifierDomain: {
                    name: "Kernel",
                    chainId: chainId,
                    version: account.kernelVersion,
                    verifyingContract: account.address
                }
            })

            expect(
                await verifyEIP6492Signature({
                    signer: account.address,
                    hash: hashedMessage,
                    signature: signature,
                    client: publicClient
                })
            ).toBeTrue()

            const ambireResult = await verifyMessage({
                signer: account.address,
                message,
                signature: signature,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.8"][chainId].rpcUrl
                )
            })
            expect(ambireResult).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "should validate typed data signatures for undeployed accounts (6492)",
        async () => {
            const account = await getEcdsaKernelAccountWithRandomSigner()
            const chainId = account.client.chain?.id ?? defaultChainId

            const domain = {
                chainId,
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
                    config["0.8"][defaultChainId].rpcUrl
                )
            })
            expect(ambireResult).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Client signMessage should return a valid signature",
        async () => {
            const chainId = kernelClient.chain?.id ?? defaultChainId
            const message = "hello world"
            const hashedMessage = hashMessage({
                message,
                verifierDomain: {
                    name: "Kernel",
                    chainId: chainId,
                    version: account.kernelVersion,
                    verifyingContract: account.address
                }
            })

            const isCode = await publicClient.getCode({
                address: account.address
            })
            // to make sure kernel is deployed
            if (!isCode) {
                console.log("kernel is not deployed, deploying it...")
                // to make sure kernel is deployed
                const txHash = await kernelClient.sendTransaction({
                    calls: [
                        {
                            to: zeroAddress,
                            value: 0n,
                            data: "0x"
                        }
                    ]
                })
                await publicClient.waitForTransactionReceipt({
                    hash: txHash
                })
            }

            const signature = await kernelClient.signMessage({
                message
            })

            const eip1271response = await publicClient.readContract({
                address: account.address,
                abi: EIP1271Abi,
                functionName: "isValidSignature",
                args: [hashedMessage, signature]
            })
            expect(signature).toBeString()
            expect(signature).toHaveLength(SIGNATURE_LENGTH)
            expect(signature).toMatch(SIGNATURE_REGEX)
            expect(eip1271response).toEqual("0x1626ba7e")
        },
        TEST_TIMEOUT
    )

    test(
        "Client signMessage should return a valid replayable signature from signMessage",
        async () => {
            const message =
                "0x51ec26f01af586507f7a8198bc8fba82754567b5cca1bff07f9765ebfe69ed66"
            const sepoliaAccount = account
            const arbSepoliaAccount = await getSignerToEcdsaKernelAccount({
                chain: arbitrumSepolia.id
            })
            const sepoliaPublicClient = publicClient
            const arbSepoliaPublicClient = await getPublicClient(
                arbitrumSepolia.id
            )

            // kernelClient
            const sepoliaKernelClient = await getKernelAccountClient({
                chainId: sepolia.id,
                account: sepoliaAccount
            })
            const arbSepoliaKernelClient = await getKernelAccountClient({
                chainId: arbitrumSepolia.id,
                account: arbSepoliaAccount
            })

            // deploy account if not deployed
            const isCodeSepolia = await sepoliaPublicClient.getCode({
                address: sepoliaAccount.address
            })
            const isCodeArbSepolia = await arbSepoliaPublicClient.getCode({
                address: arbSepoliaAccount.address
            })
            if (!isCodeSepolia) {
                console.log(
                    "kernel is not deployed on sepolia, deploying it..."
                )
                // to make sure kernel is deployed
                const txHash = await sepoliaKernelClient.sendTransaction({
                    calls: [
                        {
                            to: zeroAddress,
                            value: 0n,
                            data: "0x"
                        }
                    ]
                })
                await sepoliaPublicClient.waitForTransactionReceipt({
                    hash: txHash
                })
            }
            if (!isCodeArbSepolia) {
                console.log(
                    "kernel is not deployed on arbSepolia, deploying it..."
                )
                const txHash = await arbSepoliaKernelClient.sendTransaction({
                    calls: [
                        {
                            to: zeroAddress,
                            value: 0n,
                            data: "0x"
                        }
                    ]
                })
                await arbSepoliaPublicClient.waitForTransactionReceipt({
                    hash: txHash
                })
            }

            // replayable signature signed with sepolia account
            const replayableSignature = await sepoliaAccount.signMessage({
                message,
                useReplayableSignature: true
            })

            const hashedMessage = hashMessage({
                message,
                verifierDomain: {
                    name: "Kernel",
                    chainId: 0,
                    version: sepoliaAccount.kernelVersion,
                    verifyingContract: sepoliaAccount.address
                }
            })

            // verify replayable signature signed on sepolia
            const sepoliaAmbireResult = await verifyMessage({
                signer: sepoliaAccount.address,
                finalDigest: hashedMessage,
                signature: replayableSignature,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.8"][sepolia.id].rpcUrl
                )
            })
            expect(sepoliaAmbireResult).toBeTrue()
            expect(
                await verifyEIP6492Signature({
                    signer: sepoliaAccount.address,
                    hash: hashedMessage,
                    signature: replayableSignature,
                    client: sepoliaPublicClient
                })
            ).toBeTrue()

            // verify replayable signature signed on arbSepolia
            const arbSepoliaAmbireResult = await verifyMessage({
                signer: arbSepoliaAccount.address,
                finalDigest: hashedMessage,
                signature: replayableSignature,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.8"][arbitrumSepolia.id].rpcUrl
                )
            })
            expect(arbSepoliaAmbireResult).toBeTrue()
            expect(
                await verifyEIP6492Signature({
                    signer: arbSepoliaAccount.address,
                    hash: hashedMessage,
                    signature: replayableSignature,
                    client: arbSepoliaPublicClient
                })
            ).toBeTrue()
        },
        TEST_TIMEOUT
    )
})
