import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import {
    createEcdsaKernelMigrationAccount,
    getKernelAddressFromECDSA,
    signerToEcdsaValidator
} from "@zerodev/ecdsa-validator"
import {
    constants,
    EIP1271Abi,
    KERNEL_ADDRESSES,
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
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
    KERNEL_V3_1,
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
const SIGNATURE_LENGTH = 134
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{132}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

const migrationIndex = 42324234321212342n

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

    test(
        "Client upgrade undeployed kernel account with migration account",
        async () => {
            const privateKey = generatePrivateKey()
            const owner = privateKeyToAccount(privateKey)
            const kernelAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_0,
                [],
                migrationIndex
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()

            const kernelImplementation = await getKernelImplementationAddress(
                publicClient,
                {
                    address: kernelAccount.address
                }
            )
            console.log("kernelImplementation", kernelImplementation)

            const migrationAccount = await createEcdsaKernelMigrationAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: owner,
                    migrationVersion: {
                        from: KERNEL_V3_0,
                        to: KERNEL_V3_1
                    },
                    index: migrationIndex
                }
            )
            console.log("migrationAccount", migrationAccount.address)
            expect(migrationAccount.address).toEqual(kernelAccount.address)
            const migrationKernelClient = await getKernelAccountClient({
                account: migrationAccount,
                paymaster: zeroDevPaymaster
            })
            const migrationDeployKernelHash =
                await migrationKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            console.log(
                "migrationDeployKernelHash",
                `https://sepolia.etherscan.io/tx/${migrationDeployKernelHash}`
            )
            const migrationKernelImplementation =
                await getKernelImplementationAddress(publicClient, {
                    address: migrationAccount.address
                })
            console.log(
                "migrationKernelImplementation",
                migrationKernelImplementation
            )
            const testHash = await migrationKernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log(
                "testHash",
                `https://sepolia.etherscan.io/tx/${testHash}`
            )
            expect(isAddressEqual(kernelImplementation, zeroAddress)).toBeTrue()
            expect(
                isAddressEqual(
                    migrationKernelImplementation,
                    KernelVersionToAddressesMap[KERNEL_V3_1]
                        .accountImplementationAddress
                )
            ).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Client upgrade deployed kernel account with migration account",
        async () => {
            const privateKey = generatePrivateKey()
            const owner = privateKeyToAccount(privateKey)
            const kernelAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_0,
                [],
                migrationIndex
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: kernelAccount,
                paymaster: zeroDevPaymaster
            })
            const deployKernelHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log(
                "deployKernelHash",
                `https://sepolia.etherscan.io/tx/${deployKernelHash}`
            )

            const kernelImplementation = await getKernelImplementationAddress(
                publicClient,
                {
                    address: kernelAccount.address
                }
            )
            console.log("kernelImplementation", kernelImplementation)

            const migrationAccount = await createEcdsaKernelMigrationAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: owner,
                    migrationVersion: {
                        from: KERNEL_V3_0,
                        to: KERNEL_V3_1
                    },
                    index: migrationIndex
                }
            )
            console.log("migrationAccount", migrationAccount.address)
            expect(migrationAccount.address).toEqual(kernelAccount.address)
            const migrationKernelClient = await getKernelAccountClient({
                account: migrationAccount,
                paymaster: zeroDevPaymaster
            })
            const migrationDeployKernelHash =
                await migrationKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            console.log(
                "migrationDeployKernelHash",
                `https://sepolia.etherscan.io/tx/${migrationDeployKernelHash}`
            )
            const migrationKernelImplementation =
                await getKernelImplementationAddress(publicClient, {
                    address: migrationAccount.address
                })
            console.log(
                "migrationKernelImplementation",
                migrationKernelImplementation
            )
            const testHash = await migrationKernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log(
                "testHash",
                `https://sepolia.etherscan.io/tx/${testHash}`
            )
            expect(
                isAddressEqual(
                    kernelImplementation,
                    KernelVersionToAddressesMap[KERNEL_V3_0]
                        .accountImplementationAddress
                )
            ).toBeTrue()
            expect(
                isAddressEqual(
                    migrationKernelImplementation,
                    KernelVersionToAddressesMap[KERNEL_V3_1]
                        .accountImplementationAddress
                )
            ).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Client upgrade deployed kernel account with migration account from v3.1 to v3.2",
        async () => {
            const privateKey = generatePrivateKey()
            const owner = privateKeyToAccount(privateKey)
            const kernelAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_1,
                [],
                migrationIndex
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: kernelAccount,
                paymaster: zeroDevPaymaster
            })
            const deployKernelHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log(
                "deployKernelHash",
                `https://sepolia.etherscan.io/tx/${deployKernelHash}`
            )

            const kernelImplementation = await getKernelImplementationAddress(
                publicClient,
                {
                    address: kernelAccount.address
                }
            )
            console.log("kernelImplementation", kernelImplementation)

            const migrationAccount = await createEcdsaKernelMigrationAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: owner,
                    migrationVersion: {
                        from: KERNEL_V3_1,
                        to: KERNEL_V3_2
                    },
                    index: migrationIndex
                }
            )
            console.log("migrationAccount", migrationAccount.address)
            expect(migrationAccount.address).toEqual(kernelAccount.address)
            const migrationKernelClient = await getKernelAccountClient({
                account: migrationAccount,
                paymaster: zeroDevPaymaster
            })
            const migrationDeployKernelHash =
                await migrationKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            console.log(
                "migrationDeployKernelHash",
                `https://sepolia.etherscan.io/tx/${migrationDeployKernelHash}`
            )
            const migrationKernelImplementation =
                await getKernelImplementationAddress(publicClient, {
                    address: migrationAccount.address
                })
            console.log(
                "migrationKernelImplementation",
                migrationKernelImplementation
            )
            const testHash = await migrationKernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log(
                "testHash",
                `https://sepolia.etherscan.io/tx/${testHash}`
            )
            expect(
                isAddressEqual(
                    kernelImplementation,
                    KernelVersionToAddressesMap[KERNEL_V3_1]
                        .accountImplementationAddress
                )
            ).toBeTrue()
            expect(
                isAddressEqual(
                    migrationKernelImplementation,
                    KernelVersionToAddressesMap[KERNEL_V3_2]
                        .accountImplementationAddress
                )
            ).toBeTrue()
        },
        TEST_TIMEOUT
    )

    test(
        "Should validate message signatures for undeployed accounts (6492)",
        async () => {
            const privateKey = generatePrivateKey()
            const owner = privateKeyToAccount(privateKey)
            const kernelAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_0,
                [],
                migrationIndex
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()

            const migrationAccount = await createEcdsaKernelMigrationAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: owner,
                    migrationVersion: {
                        from: KERNEL_V3_0,
                        to: KERNEL_V3_1
                    },
                    index: migrationIndex
                }
            )
            console.log("migrationAccount", migrationAccount.address)
            expect(migrationAccount.address).toEqual(kernelAccount.address)
            const migrationKernelClient = await getKernelAccountClient({
                account: migrationAccount,
                paymaster: zeroDevPaymaster
            })
            const message = "hello world"
            const signature = await migrationKernelClient.signMessage({
                message
            })

            expect(
                await verifyEIP6492Signature({
                    signer: migrationAccount.address,
                    hash: hashMessage(message),
                    signature: signature,
                    client: publicClient
                })
            ).toBeTrue()

            // Try using Ambire as well
            const ambireResult = await verifyMessage({
                signer: migrationAccount.address,
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
            const privateKey = generatePrivateKey()
            const owner = privateKeyToAccount(privateKey)
            const kernelAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_0,
                [],
                migrationIndex
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()

            const migrationAccount = await createEcdsaKernelMigrationAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: owner,
                    migrationVersion: {
                        from: KERNEL_V3_0,
                        to: KERNEL_V3_1
                    },
                    index: migrationIndex
                }
            )
            console.log("migrationAccount", migrationAccount.address)
            expect(migrationAccount.address).toEqual(kernelAccount.address)
            const migrationKernelClient = await getKernelAccountClient({
                account: migrationAccount,
                paymaster: zeroDevPaymaster
            })
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

            const signature = await migrationKernelClient.signTypedData({
                domain,
                primaryType,
                types,
                message
            })

            expect(
                await verifyEIP6492Signature({
                    signer: migrationAccount.address,
                    hash: typedHash,
                    signature: signature,
                    client: publicClient
                })
            ).toBeTrue()

            // Try using Ambire as well
            const ambireResult = await verifyMessage({
                signer: migrationAccount.address,
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
        "Client signMessage should return a valid signature before migration",
        async () => {
            const privateKey = generatePrivateKey()
            const owner = privateKeyToAccount(privateKey)
            const kernelAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_0,
                [],
                migrationIndex
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: kernelAccount,
                paymaster: zeroDevPaymaster
            })
            const deployKernelHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log(
                "deployKernelHash",
                `https://sepolia.etherscan.io/tx/${deployKernelHash}`
            )

            const kernelImplementation = await getKernelImplementationAddress(
                publicClient,
                {
                    address: kernelAccount.address
                }
            )
            console.log("kernelImplementation", kernelImplementation)

            const migrationAccount = await createEcdsaKernelMigrationAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: owner,
                    migrationVersion: {
                        from: KERNEL_V3_0,
                        to: KERNEL_V3_1
                    },
                    index: migrationIndex
                }
            )
            console.log("migrationAccount", migrationAccount.address)
            expect(migrationAccount.address).toEqual(kernelAccount.address)
            const migrationKernelClient = await getKernelAccountClient({
                account: migrationAccount,
                paymaster: zeroDevPaymaster
            })
            // const migrationDeployKernelHash = await migrationKernelClient.sendTransaction({
            //     to: zeroAddress,
            //     value: 0n,
            //     data: "0x"
            // })
            // console.log("migrationDeployKernelHash", `https://sepolia.etherscan.io/tx/${migrationDeployKernelHash}`)

            const message = "hello world"
            const response = await migrationKernelClient.signMessage({
                message
            })
            console.log("hashMessage(message)", hashMessage(message))
            console.log("response", response)
            const ambireResult = await verifyMessage({
                signer: migrationAccount.address,
                message,
                signature: response,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.7"][sepolia.id].rpcUrl
                )
            })
            expect(ambireResult).toBeTrue()

            const eip1271response = await publicClient.readContract({
                address: migrationAccount.address,
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
        "Smart account client signTypedData before migration",
        async () => {
            const privateKey = generatePrivateKey()
            const owner = privateKeyToAccount(privateKey)
            const kernelAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_0,
                [],
                migrationIndex
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: kernelAccount,
                paymaster: zeroDevPaymaster
            })
            const deployKernelHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log(
                "deployKernelHash",
                `https://sepolia.etherscan.io/tx/${deployKernelHash}`
            )

            const kernelImplementation = await getKernelImplementationAddress(
                publicClient,
                {
                    address: kernelAccount.address
                }
            )
            console.log("kernelImplementation", kernelImplementation)

            const migrationAccount = await createEcdsaKernelMigrationAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: owner,
                    migrationVersion: {
                        from: KERNEL_V3_0,
                        to: KERNEL_V3_1
                    },
                    index: migrationIndex
                }
            )
            console.log("migrationAccount", migrationAccount.address)
            expect(migrationAccount.address).toEqual(kernelAccount.address)
            const migrationKernelClient = await getKernelAccountClient({
                account: migrationAccount,
                paymaster: zeroDevPaymaster
            })
            // const migrationDeployKernelHash = await migrationKernelClient.sendTransaction({
            //     to: zeroAddress,
            //     value: 0n,
            //     data: "0x"
            // })
            // console.log("migrationDeployKernelHash", `https://sepolia.etherscan.io/tx/${migrationDeployKernelHash}`)
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

            const response = await migrationKernelClient.signTypedData({
                domain,
                primaryType,
                types,
                message
            })

            const eip1271response = await publicClient.readContract({
                address: migrationAccount.address,
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
        "Client signMessage should return a valid signature after migration",
        async () => {
            const privateKey = generatePrivateKey()
            const owner = privateKeyToAccount(privateKey)
            const kernelAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_0,
                [],
                migrationIndex
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: kernelAccount,
                paymaster: zeroDevPaymaster
            })
            const deployKernelHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log(
                "deployKernelHash",
                `https://sepolia.etherscan.io/tx/${deployKernelHash}`
            )

            const kernelImplementation = await getKernelImplementationAddress(
                publicClient,
                {
                    address: kernelAccount.address
                }
            )
            console.log("kernelImplementation", kernelImplementation)

            const migrationAccount = await createEcdsaKernelMigrationAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: owner,
                    migrationVersion: {
                        from: KERNEL_V3_0,
                        to: KERNEL_V3_1
                    },
                    index: migrationIndex
                }
            )
            console.log("migrationAccount", migrationAccount.address)
            expect(migrationAccount.address).toEqual(kernelAccount.address)
            const migrationKernelClient = await getKernelAccountClient({
                account: migrationAccount,
                paymaster: zeroDevPaymaster
            })
            const migrationDeployKernelHash =
                await migrationKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            console.log(
                "migrationDeployKernelHash",
                `https://sepolia.etherscan.io/tx/${migrationDeployKernelHash}`
            )

            const message = "hello world"
            const response = await migrationKernelClient.signMessage({
                message
            })
            console.log("hashMessage(message)", hashMessage(message))
            console.log("response", response)
            const ambireResult = await verifyMessage({
                signer: migrationAccount.address,
                message,
                signature: response,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.7"][sepolia.id].rpcUrl
                )
            })
            expect(ambireResult).toBeTrue()

            const eip1271response = await publicClient.readContract({
                address: migrationAccount.address,
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
        "Smart account client signTypedData after migration",
        async () => {
            const privateKey = generatePrivateKey()
            const owner = privateKeyToAccount(privateKey)
            const kernelAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_0,
                [],
                migrationIndex
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: kernelAccount,
                paymaster: zeroDevPaymaster
            })
            const deployKernelHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            console.log(
                "deployKernelHash",
                `https://sepolia.etherscan.io/tx/${deployKernelHash}`
            )

            const kernelImplementation = await getKernelImplementationAddress(
                publicClient,
                {
                    address: kernelAccount.address
                }
            )
            console.log("kernelImplementation", kernelImplementation)

            const migrationAccount = await createEcdsaKernelMigrationAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: owner,
                    migrationVersion: {
                        from: KERNEL_V3_0,
                        to: KERNEL_V3_1
                    },
                    index: migrationIndex
                }
            )
            console.log("migrationAccount", migrationAccount.address)
            expect(migrationAccount.address).toEqual(kernelAccount.address)
            const migrationKernelClient = await getKernelAccountClient({
                account: migrationAccount,
                paymaster: zeroDevPaymaster
            })
            const migrationDeployKernelHash =
                await migrationKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            console.log(
                "migrationDeployKernelHash",
                `https://sepolia.etherscan.io/tx/${migrationDeployKernelHash}`
            )
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

            const response = await migrationKernelClient.signTypedData({
                domain,
                primaryType,
                types,
                message
            })

            const eip1271response = await publicClient.readContract({
                address: migrationAccount.address,
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
        "Client signMessage should return a valid signature after migration from undeployed account",
        async () => {
            const privateKey = generatePrivateKey()
            const owner = privateKeyToAccount(privateKey)
            const kernelAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_0,
                [],
                migrationIndex
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: kernelAccount,
                paymaster: zeroDevPaymaster
            })
            // const deployKernelHash = await kernelClient.sendTransaction({
            //     to: zeroAddress,
            //     value: 0n,
            //     data: "0x"
            // })
            // console.log("deployKernelHash", `https://sepolia.etherscan.io/tx/${deployKernelHash}`)

            const kernelImplementation = await getKernelImplementationAddress(
                publicClient,
                {
                    address: kernelAccount.address
                }
            )
            console.log("kernelImplementation", kernelImplementation)

            const migrationAccount = await createEcdsaKernelMigrationAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: owner,
                    migrationVersion: {
                        from: KERNEL_V3_0,
                        to: KERNEL_V3_1
                    },
                    index: migrationIndex
                }
            )
            console.log("migrationAccount", migrationAccount.address)
            expect(migrationAccount.address).toEqual(kernelAccount.address)
            const migrationKernelClient = await getKernelAccountClient({
                account: migrationAccount,
                paymaster: zeroDevPaymaster
            })
            const migrationDeployKernelHash =
                await migrationKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            console.log(
                "migrationDeployKernelHash",
                `https://sepolia.etherscan.io/tx/${migrationDeployKernelHash}`
            )

            const message = "hello world"
            const response = await migrationKernelClient.signMessage({
                message
            })
            console.log("hashMessage(message)", hashMessage(message))
            console.log("response", response)
            const ambireResult = await verifyMessage({
                signer: migrationAccount.address,
                message,
                signature: response,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.7"][sepolia.id].rpcUrl
                )
            })
            expect(ambireResult).toBeTrue()

            const eip1271response = await publicClient.readContract({
                address: migrationAccount.address,
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
        "Smart account client signTypedData after migration from undeployed account",
        async () => {
            const privateKey = generatePrivateKey()
            const owner = privateKeyToAccount(privateKey)
            const kernelAccount = await getEcdsaKernelAccountWithPrivateKey(
                privateKey,
                [],
                sepolia.id,
                KERNEL_V3_0,
                [],
                migrationIndex
            )
            console.log("kernelAccount", kernelAccount.address)
            const zeroDevPaymaster = getZeroDevPaymasterClient()
            const kernelClient = await getKernelAccountClient({
                account: kernelAccount,
                paymaster: zeroDevPaymaster
            })
            // const deployKernelHash = await kernelClient.sendTransaction({
            //     to: zeroAddress,
            //     value: 0n,
            //     data: "0x"
            // })
            // console.log("deployKernelHash", `https://sepolia.etherscan.io/tx/${deployKernelHash}`)

            const kernelImplementation = await getKernelImplementationAddress(
                publicClient,
                {
                    address: kernelAccount.address
                }
            )
            console.log("kernelImplementation", kernelImplementation)

            const migrationAccount = await createEcdsaKernelMigrationAccount(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: owner,
                    migrationVersion: {
                        from: KERNEL_V3_0,
                        to: KERNEL_V3_1
                    },
                    index: migrationIndex
                }
            )
            console.log("migrationAccount", migrationAccount.address)
            expect(migrationAccount.address).toEqual(kernelAccount.address)
            const migrationKernelClient = await getKernelAccountClient({
                account: migrationAccount,
                paymaster: zeroDevPaymaster
            })
            const migrationDeployKernelHash =
                await migrationKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            console.log(
                "migrationDeployKernelHash",
                `https://sepolia.etherscan.io/tx/${migrationDeployKernelHash}`
            )
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

            const response = await migrationKernelClient.signTypedData({
                domain,
                primaryType,
                types,
                message
            })

            const eip1271response = await publicClient.readContract({
                address: migrationAccount.address,
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
})
