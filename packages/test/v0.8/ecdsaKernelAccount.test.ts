import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import {
    getKernelAddressFromECDSA,
    signerToEcdsaValidator
} from "@zerodev/ecdsa-validator"
import {
    constants,
    EIP1271Abi,
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    createKernelAccount,
    getCustomNonceKeyFromString,
    getValidatorPluginInstallModuleData,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import { isPluginInstalled } from "@zerodev/sdk/actions"
import { PLUGIN_TYPE } from "@zerodev/sdk/constants"
import type { PluginMigrationData } from "@zerodev/sdk/types"
import dotenv from "dotenv"
import { ethers } from "ethers"
import {
    type Address,
    type Chain,
    type GetContractReturnType,
    type Hex,
    type PublicClient,
    type Transport,
    concatHex,
    decodeEventLog,
    encodeAbiParameters,
    encodeFunctionData,
    erc20Abi,
    getContract,
    hashTypedData,
    isAddressEqual,
    parseAbiParameters,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import {
    type PrivateKeyAccount,
    generatePrivateKey,
    privateKeyToAccount
} from "viem/accounts"
import { arbitrumSepolia, sepolia } from "viem/chains"
import { hashMessage } from "viem/experimental/erc7739"
import { GreeterAbi, GreeterBytecode } from "../abis/Greeter.js"
import { TokenActionsAbi } from "../abis/TokenActionsAbi.js"
import { TOKEN_ACTION_ADDRESS, config } from "../config.js"
import {
    Test_ERC20Address,
    findUserOperationEvent,
    mintToAccount,
    validateEnvironmentVariables
} from "../v0.7/utils/common.js"
import {
    defaultChainId,
    defaultIndex,
    getEntryPoint,
    getPublicClient
} from "./utils/common.js"
import {
    getEcdsaKernelAccountWithPrivateKey,
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
        greeterContract = getContract({
            abi: GreeterAbi,
            address: process.env.GREETER_ADDRESS as Address,
            client: kernelClient
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

    test(
        "Client signTypedData should return a valid signature",
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

            const response = await kernelClient.signTypedData({
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
        },
        TEST_TIMEOUT
    )

    test(
        "Client deploy contract",
        async () => {
            const userOpHash = await kernelClient.sendUserOperation({
                callData: await kernelClient.account.encodeDeployCallData({
                    abi: GreeterAbi,
                    bytecode: GreeterBytecode
                })
            })

            expect(userOpHash).toBeString()
            expect(userOpHash).toHaveLength(TX_HASH_LENGTH)
            expect(userOpHash).toMatch(TX_HASH_REGEX)

            const userOpReceipt =
                await kernelClient.waitForUserOperationReceipt({
                    hash: userOpHash
                })
            const transactionReceipt =
                await publicClient.waitForTransactionReceipt({
                    hash: userOpReceipt.receipt.transactionHash
                })

            expect(findUserOperationEvent(transactionReceipt.logs)).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send multiple calls",
        async () => {
            const txnHash = await kernelClient.sendTransaction({
                calls: [
                    {
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    },
                    {
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    },
                    {
                        to: process.env.GREETER_ADDRESS as Address,
                        value: 0n,
                        data: encodeFunctionData({
                            abi: GreeterAbi,
                            functionName: "setGreeting",
                            args: ["hello world batched"]
                        })
                    }
                ]
            })
            await publicClient.waitForTransactionReceipt({
                hash: txnHash
            })

            const newGreet = await greeterContract.read.greet()
            expect(newGreet).toBeString()
            expect(newGreet).toEqual("hello world batched")

            expect(txnHash).toBeString()
            expect(txnHash).toHaveLength(TX_HASH_LENGTH)
            expect(txnHash).toMatch(TX_HASH_REGEX)
        },
        TEST_TIMEOUT
    )

    test(
        "Write contract",
        async () => {
            const oldGreet = await greeterContract.read.greet()

            expect(oldGreet).toBeString()

            const txHash = await greeterContract.write.setGreeting([
                "hello world"
            ])
            await publicClient.waitForTransactionReceipt({
                hash: txHash
            })

            expect(txHash).toBeString()
            expect(txHash).toHaveLength(66)

            const newGreet = await greeterContract.read.greet()

            expect(newGreet).toBeString()
            expect(newGreet).toEqual("hello world")
        },
        TEST_TIMEOUT
    )

    test(
        "Client signs and then sends UserOp with paymaster",
        async () => {
            const userOp = await kernelClient.signUserOperation({
                callData: await kernelClient.account.encodeCalls([
                    {
                        to: process.env.GREETER_ADDRESS as Address,
                        value: 0n,
                        data: encodeFunctionData({
                            abi: GreeterAbi,
                            functionName: "setGreeting",
                            args: ["hello world"]
                        })
                    },
                    {
                        to: process.env.GREETER_ADDRESS as Address,
                        value: 0n,
                        data: encodeFunctionData({
                            abi: GreeterAbi,
                            functionName: "setGreeting",
                            args: ["hello world 2"]
                        })
                    }
                ])
            })
            expect(userOp.signature).not.toBe("0x")

            const userOpHash = await kernelClient.sendUserOperation({
                ...userOp
            })
            expect(userOpHash).toHaveLength(66)
            await kernelClient.waitForUserOperationReceipt({
                hash: userOpHash
            })

            const greet = await greeterContract.read.greet()
            expect(greet).toBeString()
            expect(greet).toEqual("hello world 2")
        },
        TEST_TIMEOUT
    )

    test(
        "Client send UserOp with delegatecall",
        async () => {
            const accountAddress = kernelClient.account.address
            const amountToMint = 10000000n
            const amountToTransfer = 4337n
            await mintToAccount(
                publicClient,
                kernelClient as KernelAccountClient<
                    Transport,
                    Chain,
                    SmartAccount<KernelSmartAccountImplementation>
                >,
                accountAddress,
                amountToMint
            )
            const userOpHash = await kernelClient.sendUserOperation({
                callData: await kernelClient.account.encodeCalls(
                    [
                        {
                            to: TOKEN_ACTION_ADDRESS,
                            value: 0n,
                            data: encodeFunctionData({
                                abi: TokenActionsAbi,
                                functionName: "transferERC20Action",
                                args: [
                                    Test_ERC20Address,
                                    amountToTransfer,
                                    owner
                                ]
                            })
                        }
                    ],
                    "delegatecall"
                )
            })
            const transaction = await kernelClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
            const transactionReceipt =
                await publicClient.waitForTransactionReceipt({
                    hash: transaction.receipt.transactionHash
                })
            let transferEventFound = false
            for (const log of transactionReceipt.logs) {
                try {
                    const event = decodeEventLog({
                        abi: erc20Abi,
                        ...log
                    })
                    if (
                        event.eventName === "Transfer" &&
                        event.args.from === account.address &&
                        event.args.value === amountToTransfer
                    ) {
                        transferEventFound = true
                    }
                } catch (error) {}
            }

            expect(userOpHash).toHaveLength(66)
            expect(transferEventFound).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Client send UserOp with custom nonce key",
        async () => {
            const customNonceKey = getCustomNonceKeyFromString(
                "Hello, World!",
                "0.8"
            )

            const nonce = await account.getNonce({ key: customNonceKey })

            const userOpHash = await kernelClient.sendUserOperation({
                callData: await kernelClient.account.encodeCalls([
                    {
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    }
                ]),
                nonce
            })

            expect(userOpHash).toHaveLength(TX_HASH_LENGTH)
            await kernelClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
            const res = await kernelClient.getUserOperation({
                hash: userOpHash
            })
            expect(res.userOperation.nonce).toEqual(nonce)
        },
        TEST_TIMEOUT
    )

    test(
        "Client install Kernel executors plugins automatically",
        async () => {
            const pluginToInstall: PluginMigrationData = {
                type: PLUGIN_TYPE.EXECUTOR,
                address: "0xAd8da92Dd670871bD3f90475d6763d520728881a",
                data: concatHex([
                    encodeAbiParameters(
                        parseAbiParameters(["bytes", "bytes"]),
                        ["0x", "0x"]
                    )
                ])
            }
            const kernelAccount = await getEcdsaKernelAccountWithRandomSigner(
                undefined,
                undefined,
                "0.4.0",
                [pluginToInstall]
            )
            const kernelClient = await getKernelAccountClient({
                account: kernelAccount
            })

            // plugin not installed
            const pluginInstalledBefore = await isPluginInstalled(
                publicClient,
                {
                    address: kernelAccount.address,
                    plugin: pluginToInstall
                }
            )
            expect(pluginInstalledBefore).toBeFalse()

            const userOpHash = await kernelClient.sendUserOperation({
                calls: [{ to: zeroAddress, value: 0n, data: "0x" }]
            })
            const userOpReceipt =
                await kernelClient.waitForUserOperationReceipt({
                    hash: userOpHash
                })

            // plugin installed
            const pluginInstalledAfter = await isPluginInstalled(publicClient, {
                address: kernelAccount.address,
                plugin: pluginToInstall
            })
            expect(pluginInstalledAfter).toBeTrue()

            // send transaction after plugin installed
            const transactionHash2 = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            await publicClient.waitForTransactionReceipt({
                hash: transactionHash2
            })
        },
        TEST_TIMEOUT
    )

    test(
        "Client install Kernel validator plugins automatically",
        async () => {
            const pluginToInstall = await getValidatorPluginInstallModuleData({
                plugin: {
                    address: "0x43C757131417c5a245a99c4D5B7722ec20Cb0b31",
                    getEnableData: async () => "0x"
                },
                entryPoint: getEntryPoint(),
                kernelVersion: "0.4.0"
            })
            const privateKey = generatePrivateKey()
            const kernelAccountWithoutPlugins =
                await getEcdsaKernelAccountWithPrivateKey({
                    privateKey
                })
            const kernelAccountWithPlugins =
                await getEcdsaKernelAccountWithPrivateKey({
                    privateKey,
                    pluginMigrations: [pluginToInstall]
                })

            expect(
                isAddressEqual(
                    kernelAccountWithoutPlugins.address,
                    kernelAccountWithPlugins.address
                )
            ).toBeTrue()
            let kernelClient = await getKernelAccountClient({
                account: kernelAccountWithoutPlugins
            })
            const txnHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            await publicClient.waitForTransactionReceipt({
                hash: txnHash
            })

            kernelClient = await getKernelAccountClient({
                account: kernelAccountWithPlugins
            })

            const pluginInstalledBefore = await isPluginInstalled(
                publicClient,
                {
                    address: kernelAccountWithPlugins.address,
                    plugin: pluginToInstall
                }
            )

            const userOpHash = await kernelClient.sendUserOperation({
                calls: [{ to: zeroAddress, value: 0n, data: "0x" }]
            })
            await kernelClient.waitForUserOperationReceipt({
                hash: userOpHash
            })

            const pluginInstalledAfter = await isPluginInstalled(publicClient, {
                address: kernelAccountWithPlugins.address,
                plugin: pluginToInstall
            })

            // send another userOp after plugin installed
            expect(pluginInstalledBefore).toBeFalse()
            expect(pluginInstalledAfter).toBeTrue()
            await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
        },
        TEST_TIMEOUT
    )

    test(
        "Can use a deployed account",
        async () => {
            // Send an initial tx to deploy the account
            const hash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })

            // Wait for the tx to be done (so we are sure that the account is deployed)
            await publicClient.waitForTransactionReceipt({ hash })
            const deployedAccountAddress = account.address

            // Build a new account with a valid owner
            const signer = privateKeyToAccount(
                process.env.TEST_PRIVATE_KEY as Hex
            )
            const ecdsaValidatorPlugin = await signerToEcdsaValidator(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer,
                    kernelVersion: account.kernelVersion
                }
            )
            const alreadyDeployedEcdsaSmartAccount = await createKernelAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    plugins: {
                        sudo: ecdsaValidatorPlugin
                    },
                    address: deployedAccountAddress,
                    index: defaultIndex,
                    kernelVersion: account.kernelVersion
                }
            )

            // Ensure the two account have the same address
            expect(alreadyDeployedEcdsaSmartAccount.address).toMatch(
                account.address
            )
        },
        TEST_TIMEOUT
    )
})
