import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import {
    getKernelAddressFromECDSA,
    signerToEcdsaValidator
} from "@zerodev/ecdsa-validator"
import {
    constants,
    EIP1271Abi,
    KERNEL_ADDRESSES,
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    getValidatorPluginInstallModuleData,
    createKernelAccount,
    getCustomNonceKeyFromString,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import {
    getKernelImplementationAddress,
    isPluginInstalled
} from "@zerodev/sdk/actions"
import dotenv from "dotenv"
import { ethers } from "ethers"
import {
    type Address,
    type Chain,
    type GetContractReturnType,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    type Transport,
    concat,
    concatHex,
    decodeEventLog,
    encodeAbiParameters,
    encodeFunctionData,
    erc20Abi,
    getContract,
    hashMessage,
    hashTypedData,
    isAddressEqual,
    parseAbiParameters,
    zeroAddress
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { baseSepolia, sepolia } from "viem/chains"
import { EntryPointAbi } from "../abis/EntryPoint.js"
import { GreeterAbi, GreeterBytecode } from "../abis/Greeter.js"
import { TokenActionsAbi } from "../abis/TokenActionsAbi.js"
import { TOKEN_ACTION_ADDRESS, config } from "../config.js"

import {
    KERNEL_V3_0,
    KERNEL_V3_2,
    KernelVersionToAddressesMap,
    PLUGIN_TYPE
} from "@zerodev/sdk/constants"
import type { PluginMigrationData } from "@zerodev/sdk/types"
import {
    type SmartAccount,
    entryPoint07Address
} from "viem/account-abstraction"
import {
    Test_ERC20Address,
    findUserOperationEvent,
    getEntryPoint,
    getPublicClient,
    getZeroDevPaymasterClient,
    index,
    kernelVersion,
    mintToAccount,
    validateEnvironmentVariables,
    waitForNonceUpdate
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
    "ZERODEV_PROJECT_ID",
    "ZERODEV_BUNDLER_RPC_HOST",
    "ZERODEV_PAYMASTER_RPC_HOST"
]

validateEnvironmentVariables(requiredEnvVars)

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("ECDSA kernel Account", () => {
    let account: SmartAccount<KernelSmartAccountImplementation>
    let ownerAccount: PrivateKeyAccount
    let publicClient: PublicClient
    let kernelClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >
    let greeterContract: GetContractReturnType<
        typeof GreeterAbi,
        typeof kernelClient,
        Address
    >
    let owner: Address

    beforeAll(async () => {
        const ownerPrivateKey = process.env.TEST_PRIVATE_KEY
        if (!ownerPrivateKey) {
            throw new Error("TEST_PRIVATE_KEY is not set")
        }
        ownerAccount = privateKeyToAccount(ownerPrivateKey as Hex)
        account = await getSignerToEcdsaKernelAccount()
        owner = privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex).address
        publicClient = await getPublicClient()
        const zeroDevPaymaster = getZeroDevPaymasterClient()
        kernelClient = await getKernelAccountClient({
            account,
            paymaster: zeroDevPaymaster
            // paymaster: {
            //     getPaymasterData(parameters) {
            //         return zeroDevPaymaster.sponsorUserOperation({
            //             userOperation: parameters
            //         })
            //     }
            // },
        })
        greeterContract = getContract({
            abi: GreeterAbi,
            address: process.env.GREETER_ADDRESS as Address,
            client: kernelClient
        })
    })

    test("Account address should be a valid Ethereum address", async () => {
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(account.address).not.toEqual(zeroAddress)
        console.log("account.address: ", account.address)
    })

    test("getKernelAddressFromECDSA util should return valid account address", async () => {
        const generatedAccountAddress = await getKernelAddressFromECDSA({
            entryPoint: { address: entryPoint07Address, version: "0.7" },
            kernelVersion,
            eoaAddress: ownerAccount.address,
            index: index,
            initCodeHash:
                constants.KernelVersionToAddressesMap[kernelVersion]
                    .initCodeHash ?? "0x"
        })
        console.log(
            "Generate accountAddress using getKernelAddressFromECDSA: ",
            generatedAccountAddress
        )
        expect(account.address).toEqual(generatedAccountAddress)
    })

    // test("Account should throw when trying to sign a transaction", async () => {
    //     await expect(async () => {
    //         await account.signTransaction({
    //             to: zeroAddress,
    //             value: 0n,
    //             data: "0x"
    //         })
    //     }).toThrow(new SignTransactionNotSupportedBySmartAccount())
    // })

    test(
        "Should validate message signatures for undeployed accounts (6492)",
        async () => {
            const account = await getEcdsaKernelAccountWithRandomSigner()
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

            const account = await getEcdsaKernelAccountWithRandomSigner()
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
            const tx = await kernelClient.sendTransaction({
                calls: [
                    {
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    }
                ]
            })
            console.log("tx", tx)

            const message = "hello world"
            const response = await kernelClient.signMessage({
                message
            })
            console.log("hashMessage(message)", hashMessage(message))
            console.log("response", response)
            const ambireResult = await verifyMessage({
                signer: account.address,
                message,
                signature: response,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.7"][sepolia.id].rpcUrl
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
            expect(response).toHaveLength(SIGNATURE_LENGTH)
            expect(response).toMatch(SIGNATURE_REGEX)
        },
        TEST_TIMEOUT
    )

    test(
        "Client signMessage should return a valid replayable signature from signMessage",
        async () => {
            const privateKey = generatePrivateKey()
            const sepoliaAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_2
            )
            const baseSepoliaAccount =
                await getEcdsaKernelAccountWithPrivateKey(
                    privateKey,
                    [],
                    baseSepolia.id,
                    KERNEL_V3_2
                )
            const sepoliaPublicClient = await getPublicClient(sepolia.id)
            const baseSepoliaPublicClient = await getPublicClient(
                baseSepolia.id
            )

            const message =
                "0x51ec26f01af586507f7a8198bc8fba82754567b5cca1bff07f9765ebfe69ed66"
            const replayableSignature = await sepoliaAccount.signMessage({
                message,
                useReplayableSignature: true
            })
            console.log("replayableSignature", replayableSignature)

            const sepoliaAmbireResult = await verifyMessage({
                signer: sepoliaAccount.address,
                // message,
                finalDigest: hashMessage(message),
                signature: replayableSignature,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.7"][sepolia.id].rpcUrl
                )
            })
            expect(sepoliaAmbireResult).toBeTrue()

            expect(
                await verifyEIP6492Signature({
                    signer: sepoliaAccount.address,
                    hash: hashMessage(message),
                    signature: replayableSignature,
                    client: sepoliaPublicClient
                })
            ).toBeTrue()

            const baseSepoliaAmbireResult = await verifyMessage({
                signer: baseSepoliaAccount.address,
                message,
                signature: replayableSignature,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.7"][baseSepolia.id].rpcUrl
                )
            })
            expect(baseSepoliaAmbireResult).toBeTrue()

            expect(
                await verifyEIP6492Signature({
                    signer: baseSepoliaAccount.address,
                    hash: hashMessage(message),
                    signature: replayableSignature,
                    client: baseSepoliaPublicClient
                })
            ).toBeTrue()

            expect(replayableSignature).toBeString()
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
            expect(response).toHaveLength(SIGNATURE_LENGTH)
            expect(response).toMatch(SIGNATURE_REGEX)
        },
        TEST_TIMEOUT
    )

    test(
        "Client deploy contract",
        async () => {
            const response = await kernelClient.sendUserOperation({
                callData: await kernelClient.account.encodeDeployCallData({
                    abi: GreeterAbi,
                    bytecode: GreeterBytecode
                })
            })

            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)

            const rcpt = await kernelClient.waitForUserOperationReceipt({
                hash: response
            })
            const transactionReceipt =
                await publicClient.waitForTransactionReceipt({
                    hash: rcpt.receipt.transactionHash
                })

            expect(findUserOperationEvent(transactionReceipt.logs)).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Smart account client send multiple transactions",
        async () => {
            const response = await kernelClient.sendTransaction({
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
            const newGreet = await greeterContract.read.greet()

            expect(newGreet).toBeString()
            expect(newGreet).toEqual("hello world batched")

            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)
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

            await waitForNonceUpdate()

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
                kernelClient,
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
            console.log(
                "transferTransactionHash",
                `https://sepolia.etherscan.io/tx/${transaction.receipt.transactionHash}`
            )
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

            await waitForNonceUpdate()
        },
        TEST_TIMEOUT
    )

    test(
        "Client send UserOp with custom nonce key",
        async () => {
            const customNonceKey = getCustomNonceKeyFromString(
                "Hello, World!",
                "0.7"
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

            expect(userOpHash).toHaveLength(66)
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
        "Client send Transaction with paymaster",
        async () => {
            const transactionHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log("transactionHash", transactionHash)

            expect(transactionHash).toBeString()
            expect(transactionHash).toHaveLength(TX_HASH_LENGTH)
            expect(transactionHash).toMatch(TX_HASH_REGEX)

            const transactionReceipt =
                await publicClient.waitForTransactionReceipt({
                    hash: transactionHash
                })

            expect(findUserOperationEvent(transactionReceipt.logs)).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Client send multiple Transactions with paymaster",
        async () => {
            const account = await getSignerToEcdsaKernelAccount()
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account,
                paymaster: zeroDevPaymaster
                // paymaster: {
                //     getPaymasterData(parameters) {
                //         return zeroDevPaymaster.sponsorUserOperation({
                //             userOperation: parameters
                //         })
                //     }
                // }
            })

            const response = await kernelClient.sendTransaction({
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
                    }
                ]
            })

            expect(response).toBeString()
            expect(response).toHaveLength(66)
            expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)

            const transactionReceipt =
                await publicClient.waitForTransactionReceipt({
                    hash: response
                })

            let eventFound = false

            for (const log of transactionReceipt.logs) {
                // Encapsulated inside a try catch since if a log isn't wanted from this abi it will throw an error
                try {
                    const event = decodeEventLog({
                        abi: EntryPointAbi,
                        ...log
                    })
                    if (event.eventName === "UserOperationEvent") {
                        eventFound = true
                        const userOperation =
                            await kernelClient.getUserOperation({
                                hash: event.args.userOpHash
                            })
                        expect(
                            userOperation?.userOperation.paymasterAndData
                        ).not.toBe("0x")
                    }
                } catch {}
            }

            expect(eventFound).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Client upgrade kernel",
        async () => {
            const originalKernelVersion = KERNEL_V3_0
            const newKernelVersion = KERNEL_V3_2
            const kernelAccountV030 =
                await getEcdsaKernelAccountWithRandomSigner(
                    undefined,
                    undefined,
                    originalKernelVersion
                )
            console.log("kernelAccountV030", kernelAccountV030.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: kernelAccountV030,
                paymaster: zeroDevPaymaster
            })
            const deployKernelHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log(
                "deployKernelReceipt",
                `https://sepolia.etherscan.io/tx/${deployKernelHash}`
            )
            const kernelImplementation = await getKernelImplementationAddress(
                publicClient,
                {
                    address: kernelAccountV030.address
                }
            )
            console.log("kernelImplementation", kernelImplementation)

            const upgradeKernelHash = await kernelClient.upgradeKernel({
                kernelVersion: newKernelVersion
            })
            console.log("upgradeKernelHash", upgradeKernelHash)
            const upgradeKernelReceipt =
                await kernelClient.waitForUserOperationReceipt({
                    hash: upgradeKernelHash
                })
            console.log(
                "upgradeKernelReceipt",
                `https://sepolia.etherscan.io/tx/${upgradeKernelReceipt.receipt.transactionHash}`
            )
            const kernelImplementationAfterUpgrade =
                await getKernelImplementationAddress(publicClient, {
                    address: kernelAccountV030.address
                })
            console.log(
                "kernelImplementationAfterUpgrade",
                kernelImplementationAfterUpgrade
            )
            expect(
                isAddressEqual(
                    kernelImplementation,
                    KernelVersionToAddressesMap[originalKernelVersion]
                        .accountImplementationAddress
                )
            ).toBeTrue()
            expect(
                isAddressEqual(
                    kernelImplementationAfterUpgrade,
                    KernelVersionToAddressesMap[newKernelVersion]
                        .accountImplementationAddress
                )
            ).toBeTrue()
            expect(upgradeKernelReceipt.receipt.status).toBe("success")
        },
        TEST_TIMEOUT
    )

    test(
        "Client install Kernel plugins automatically",
        async () => {
            const pluginToInstall: PluginMigrationData = {
                type: PLUGIN_TYPE.EXECUTOR,
                address: "0xAd8da92Dd670871bD3f90475d6763d520728881a",
                data: concatHex([
                    zeroAddress,
                    encodeAbiParameters(
                        parseAbiParameters(["bytes", "bytes"]),
                        ["0x", "0x"]
                    )
                ])
            }
            const kernelAccount = await getEcdsaKernelAccountWithRandomSigner(
                undefined,
                undefined,
                "0.3.0",
                [pluginToInstall]
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: kernelAccount,
                paymaster: zeroDevPaymaster
            })

            const pluginInstalledBefore = await isPluginInstalled(
                publicClient,
                {
                    address: kernelAccount.address,
                    plugin: pluginToInstall
                }
            )
            console.log("pluginInstalledBefore", pluginInstalledBefore)

            const userOpHash = await kernelClient.sendUserOperation({
                calls: [{ to: zeroAddress, value: 0n, data: "0x" }]
                // callData: await kernelClient.account.encodeCalls([
                //     { to: zeroAddress, value: 0n, data: "0x" }
                // ])
            })
            console.log("userOpHash", userOpHash)
            const userOpReceipt =
                await kernelClient.waitForUserOperationReceipt({
                    hash: userOpHash
                })
            console.log("userOpReceipt", userOpReceipt.receipt.transactionHash)

            const pluginInstalledAfter = await isPluginInstalled(publicClient, {
                address: kernelAccount.address,
                plugin: pluginToInstall
            })
            console.log("pluginInstalledAfter", pluginInstalledAfter)

            expect(pluginInstalledBefore).toBeFalse()
            expect(pluginInstalledAfter).toBeTrue()
            const transactionHash2 = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log("transactionHash2", transactionHash2)
        },
        TEST_TIMEOUT
    )

    test(
        "Client install Kernel validator plugins automatically",
        async () => {
            const pluginToInstall = await getValidatorPluginInstallModuleData({
                plugin: {
                    address: "0x43C757131417c5a245a99c4D5B7722ec20Cb0b31",
                    getEnableData: async () => "0xb33f"
                },
                entryPoint: getEntryPoint(),
                kernelVersion: "0.3.1"
            })
            const privateKey = generatePrivateKey()
            const kernelAccountWithoutPlugins =
                await getEcdsaKernelAccountWithPrivateKey(
                    privateKey,
                    undefined,
                    undefined,
                    "0.3.1",
                    undefined,
                    BigInt(0)
                )
            console.log(
                "kernelAccountWithoutPlugins",
                kernelAccountWithoutPlugins.address
            )
            const kernelAccountWithPlugins =
                await getEcdsaKernelAccountWithPrivateKey(
                    privateKey,
                    undefined,
                    undefined,
                    "0.3.1",
                    [pluginToInstall],
                    BigInt(0)
                )
            console.log(
                "kernelAccountWithPlugins",
                kernelAccountWithPlugins.address
            )
            expect(
                isAddressEqual(
                    kernelAccountWithoutPlugins.address,
                    kernelAccountWithPlugins.address
                )
            ).toBeTrue()
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            let kernelClient = await getKernelAccountClient({
                account: kernelAccountWithoutPlugins,
                paymaster: zeroDevPaymaster
            })
            const deployKernelHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log(
                "deployKernelReceipt",
                `https://sepolia.etherscan.io/tx/${deployKernelHash}`
            )

            kernelClient = await getKernelAccountClient({
                account: kernelAccountWithPlugins,
                paymaster: zeroDevPaymaster
            })

            const pluginInstalledBefore = await isPluginInstalled(
                publicClient,
                {
                    address: kernelAccountWithPlugins.address,
                    plugin: pluginToInstall
                }
            )
            console.log("pluginInstalledBefore", pluginInstalledBefore)

            const userOpHash = await kernelClient.sendUserOperation({
                calls: [{ to: zeroAddress, value: 0n, data: "0x" }]
                // callData: await kernelClient.account.encodeCalls([
                //     { to: zeroAddress, value: 0n, data: "0x" }
                // ])
            })
            console.log("userOpHash", userOpHash)
            const userOpReceipt =
                await kernelClient.waitForUserOperationReceipt({
                    hash: userOpHash
                })
            console.log("userOpReceipt", userOpReceipt.receipt.transactionHash)

            const pluginInstalledAfter = await isPluginInstalled(publicClient, {
                address: kernelAccountWithPlugins.address,
                plugin: pluginToInstall
            })
            console.log("pluginInstalledAfter", pluginInstalledAfter)

            expect(pluginInstalledBefore).toBeFalse()
            expect(pluginInstalledAfter).toBeTrue()
            const transactionHash2 = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log("transactionHash2", transactionHash2)
        },
        TEST_TIMEOUT
    )

    // [TODO] - erc20 paymaster integration with EP v0.7
    // test(
    //     "Client send transaction with ERC20 paymaster",
    //     async () => {
    //         const account = await getSignerToEcdsaKernelAccount()

    //         const publicClient = await getPublicClient()

    //         const bundlerClient = getKernelBundlerClient()

    //         const kernelClient = await getKernelAccountClient({
    //             account,
    //             middleware: {
    //                 sponsorUserOperation: async ({
    //                     entryPoint,
    //                     userOperation
    //                 }) => {
    //                     const zerodevPaymaster =
    //                         getZeroDevERC20PaymasterClient()
    //                     return zerodevPaymaster.sponsorUserOperation({
    //                         userOperation,
    //                         entryPoint,
    //                         gasToken: gasTokenAddresses[goerli.id]["6TEST"]
    //                     })
    //                 }
    //             }
    //         })

    //         const pmClient = await getZeroDevERC20PaymasterClient()
    //         const response = await kernelClient.sendTransactions({
    //             transactions: [
    //                 {
    //                     to: gasTokenAddresses[goerli.id]["6TEST"],
    //                     data: encodeFunctionData({
    //                         abi: TEST_ERC20Abi,
    //                         functionName: "mint",
    //                         args: [account.address, 100000n]
    //                     }),
    //                     value: 0n
    //                 },
    //                 await getERC20PaymasterApproveCall(pmClient, {
    //                     gasToken: gasTokenAddresses[goerli.id]["6TEST"],
    //                     approveAmount: 100000n
    //                 }),
    //                 {
    //                     to: zeroAddress,
    //                     value: 0n,
    //                     data: "0x"
    //                 }
    //             ]
    //         })

    //         console.log(
    //             "erc20PMTransaction:",
    //             `https://mumbai.polygonscan.com/tx/${response}`
    //         )

    //         expect(response).toBeString()
    //         expect(response).toHaveLength(66)
    //         expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)

    //         const transactionReceipt =
    //             await publicClient.waitForTransactionReceipt({
    //                 hash: response
    //             })

    //         let transferEventFound = false
    //         for (const log of transactionReceipt.logs) {
    //             try {
    //                 const event = decodeEventLog({
    //                     abi: erc20Abi,
    //                     ...log
    //                 })
    //                 if (
    //                     event.eventName === "Transfer" &&
    //                     event.args.from === account.address
    //                 ) {
    //                     transferEventFound = true
    //                 }
    //             } catch (error) {}
    //         }
    //         let userOpEventFound = false
    //         for (const log of transactionReceipt.logs) {
    //             // Encapsulated inside a try catch since if a log isn't wanted from this abi it will throw an error
    //             try {
    //                 const event = decodeEventLog({
    //                     abi: EntryPointAbi,
    //                     ...log
    //                 })
    //                 if (event.eventName === "UserOperationEvent") {
    //                     userOpEventFound = true
    //                     console.log(
    //                         "jiffyScanLink:",
    //                         `https://jiffyscan.xyz/userOpHash/${event.args.userOpHash}?network=mumbai/`
    //                     )
    //                     const userOperation =
    //                         await bundlerClient.getUserOperationByHash({
    //                             hash: event.args.userOpHash
    //                         })
    //                     expect(
    //                         userOperation?.userOperation.paymasterAndData
    //                     ).not.toBe("0x")
    //                 }
    //             } catch {}
    //         }

    //         expect(transferEventFound).toBeTrue()
    //         expect(userOpEventFound).toBeTrue()
    //     },
    //     TEST_TIMEOUT
    // )

    test(
        "Can use a deployed account",
        async () => {
            const initialEcdsaSmartAccount =
                await getSignerToEcdsaKernelAccount()
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: initialEcdsaSmartAccount,
                paymaster: zeroDevPaymaster
                // paymaster: {
                //     getPaymasterData(parameters) {
                //         return zeroDevPaymaster.sponsorUserOperation({
                //             userOperation: parameters
                //         })
                //     }
                // }
            })

            // Send an initial tx to deploy the account
            const hash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })

            // Wait for the tx to be done (so we are sure that the account is deployed)
            await publicClient.waitForTransactionReceipt({ hash })
            const deployedAccountAddress = initialEcdsaSmartAccount.address

            // Build a new account with a valid owner
            const signer = privateKeyToAccount(
                process.env.TEST_PRIVATE_KEY as Hex
            )
            const ecdsaValidatorPlugin = await signerToEcdsaValidator(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer,
                    kernelVersion
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
                    index,
                    kernelVersion
                }
            )

            // Ensure the two account have the same address
            expect(alreadyDeployedEcdsaSmartAccount.address).toMatch(
                initialEcdsaSmartAccount.address
            )
        },
        TEST_TIMEOUT
    )
})
