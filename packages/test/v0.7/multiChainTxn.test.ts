// @ts-expect-error
import { describe, test } from "bun:test"
import {
    addressToEmptyAccount,
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { bundlerActions } from "permissionless"
import { http, type Hex, createPublicClient, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { optimismSepolia, sepolia } from "viem/chains"
import { signUserOps } from "../../../plugins/multichain/signUserOps"
import { signUserOpsWithEnable } from "../../../plugins/multichain/signUserOpsWithEnable"
import { toMultiChainValidator } from "../../../plugins/multichain/toMultiChainValidator"
import { deserializePermissionAccount } from "../../../plugins/permission/deserializePermissionAccount"
import { toSudoPolicy } from "../../../plugins/permission/policies"
import { serializeMultiChainPermissionAccounts } from "../../../plugins/permission/serializeMultiChainPermissionAccounts"
import { toECDSASigner } from "../../../plugins/permission/signers"
import { toPermissionValidator } from "../../../plugins/permission/toPermissionValidator"
import { getEntryPoint } from "./utils"

const TEST_TIMEOUT = 1000000

describe("MultiChainValidator", () => {
    const SEPOLIA_RPC_URL =
        "https://sepolia.infura.io/v3/f36f7f706a58477884ce6fe89165666c"
    const OPTIMISM_SEPOLIA_RPC_URL =
        "https://optimism-sepolia.infura.io/v3/d63773823d9442449d1c2cdfb4c07431"

    const SEPOLIA_ZERODEV_RPC_URL =
        "https://rpc.zerodev.app/api/v2/bundler/efbc1add-1c14-476e-b3f1-206db80e673c"
    const SEPOLIA_ZERODEV_PAYMASTER_RPC_URL =
        "https://rpc.zerodev.app/api/v2/paymaster/efbc1add-1c14-476e-b3f1-206db80e673c"

    const OPTIMISM_SEPOLIA_ZERODEV_RPC_URL =
        "https://rpc.zerodev.app/api/v2/bundler/c146fa17-8920-4399-bd66-01f35e2a2e85"
    const OPTIMISM_SEPOLIA_ZERODEV_PAYMASTER_RPC_URL =
        "https://rpc.zerodev.app/api/v2/paymaster/c146fa17-8920-4399-bd66-01f35e2a2e85"

    const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY

    test(
        "can send multi chain user ops with multi chain validator plugin",
        async () => {
            const sepoliaPublicClient = createPublicClient({
                transport: http(SEPOLIA_RPC_URL)
            })
            const optimismSepoliaPublicClient = createPublicClient({
                transport: http(OPTIMISM_SEPOLIA_RPC_URL)
            })

            const signer = privateKeyToAccount(PRIVATE_KEY as Hex)
            const sepoliaMultiSigECDSAValidatorPlugin =
                await toMultiChainValidator(sepoliaPublicClient, {
                    entryPoint: getEntryPoint(),
                    signer
                })
            const optimismSepoliaMultiSigECDSAValidatorPlugin =
                await toMultiChainValidator(optimismSepoliaPublicClient, {
                    entryPoint: getEntryPoint(),
                    signer
                })

            const sepoliaKernelAccount = await createKernelAccount(
                sepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    plugins: {
                        sudo: sepoliaMultiSigECDSAValidatorPlugin
                    }
                }
            )

            const optimismSepoliaKernelAccount = await createKernelAccount(
                optimismSepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    plugins: {
                        sudo: optimismSepoliaMultiSigECDSAValidatorPlugin
                    }
                }
            )

            console.log(
                "sepoliaKernelAccount.address",
                sepoliaKernelAccount.address
            )
            console.log(
                "optimismSepoliaKernelAccount.address",
                optimismSepoliaKernelAccount.address
            )

            const sepoliaZeroDevPaymasterClient = createZeroDevPaymasterClient({
                chain: sepolia,
                transport: http(SEPOLIA_ZERODEV_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const opSepoliaZeroDevPaymasterClient =
                createZeroDevPaymasterClient({
                    chain: optimismSepolia,
                    transport: http(OPTIMISM_SEPOLIA_ZERODEV_PAYMASTER_RPC_URL),
                    entryPoint: getEntryPoint()
                })

            const sepoliaZerodevKernelClient = createKernelAccountClient({
                account: sepoliaKernelAccount,
                chain: sepolia,
                bundlerTransport: http(SEPOLIA_ZERODEV_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return sepoliaZeroDevPaymasterClient.sponsorUserOperation(
                            {
                                userOperation,
                                entryPoint: getEntryPoint()
                            }
                        )
                    }
                },
                entryPoint: getEntryPoint()
            })

            const optimismSepoliaZerodevKernelClient =
                createKernelAccountClient({
                    account: optimismSepoliaKernelAccount,
                    chain: optimismSepolia,
                    bundlerTransport: http(OPTIMISM_SEPOLIA_ZERODEV_RPC_URL),
                    middleware: {
                        sponsorUserOperation: async ({ userOperation }) => {
                            return opSepoliaZeroDevPaymasterClient.sponsorUserOperation(
                                {
                                    userOperation,
                                    entryPoint: getEntryPoint()
                                }
                            )
                        }
                    },
                    entryPoint: getEntryPoint()
                })

            const sepoliaUserOp =
                await sepoliaZerodevKernelClient.prepareMultiUserOpRequest(
                    {
                        userOperation: {
                            callData: await sepoliaKernelAccount.encodeCallData(
                                {
                                    to: zeroAddress,
                                    value: BigInt(0),
                                    data: "0x"
                                }
                            )
                        }
                    },
                    2
                )

            const optimismSepoliaUserOp =
                await optimismSepoliaZerodevKernelClient.prepareMultiUserOpRequest(
                    {
                        userOperation: {
                            callData:
                                await optimismSepoliaKernelAccount.encodeCallData(
                                    {
                                        to: zeroAddress,
                                        value: BigInt(0),
                                        data: "0x"
                                    }
                                )
                        }
                    },
                    2
                )

            const signedUserOps = await signUserOps({
                account: sepoliaKernelAccount,
                multiUserOps: [
                    { userOperation: sepoliaUserOp, chainId: sepolia.id },
                    {
                        userOperation: optimismSepoliaUserOp,
                        chainId: optimismSepolia.id
                    }
                ],
                entryPoint: getEntryPoint()
            })

            const sepoliaBundlerClient = sepoliaZerodevKernelClient.extend(
                bundlerActions(getEntryPoint())
            )

            const optimismSepoliaBundlerClient =
                optimismSepoliaZerodevKernelClient.extend(
                    bundlerActions(getEntryPoint())
                )

            console.log("sending sepoliaUserOp")
            const sepoliaUserOpHash =
                await sepoliaZerodevKernelClient.sendSignedUserOperation({
                    userOperation: signedUserOps[0],
                    entryPoint: getEntryPoint()
                })

            console.log("sepoliaUserOpHash", sepoliaUserOpHash)
            await sepoliaBundlerClient.waitForUserOperationReceipt({
                hash: sepoliaUserOpHash
            })

            console.log("sending optimismSepoliaUserOp")
            const optimismSepoliaUserOpHash =
                await optimismSepoliaZerodevKernelClient.sendSignedUserOperation(
                    {
                        userOperation: signedUserOps[1],
                        entryPoint: getEntryPoint()
                    }
                )

            console.log("optimismSepoliaUserOpHash", optimismSepoliaUserOpHash)
            await optimismSepoliaBundlerClient.waitForUserOperationReceipt({
                hash: optimismSepoliaUserOpHash
            })
        },
        TEST_TIMEOUT
    )

    test(
        "can send multi chain user ops with enabling regular validators",
        async () => {
            const sepoliaPublicClient = createPublicClient({
                transport: http(SEPOLIA_RPC_URL)
            })
            const optimismSepoliaPublicClient = createPublicClient({
                transport: http(OPTIMISM_SEPOLIA_RPC_URL)
            })

            const signer = privateKeyToAccount(PRIVATE_KEY as Hex)
            const sepoliaMultiChainValidatorPlugin =
                await toMultiChainValidator(sepoliaPublicClient, {
                    entryPoint: getEntryPoint(),
                    signer
                })
            const optimismSepoliaMultiChainValidatorPlugin =
                await toMultiChainValidator(optimismSepoliaPublicClient, {
                    entryPoint: getEntryPoint(),
                    signer
                })

            const sepoliaEcdsaSigner = privateKeyToAccount(
                "0xd53978f1a41e9f149d9e151c11f08edebb80340d2767a086d8bf5c7221064ff9"
            )
            const sepoliaEcdsaModularSigner = toECDSASigner({
                signer: sepoliaEcdsaSigner
            })

            const optimismSepoliaEcdsaSigner = privateKeyToAccount(
                "0x8d1348978bac94a2f019e80cbf42e8b5427f9a45e579a03ad341103813845696"
            )
            const optimismSepoliaEcdsaModularSigner = toECDSASigner({
                signer: optimismSepoliaEcdsaSigner
            })

            const sudoPolicy = toSudoPolicy({})

            const sepoliaPermissionPlugin = await toPermissionValidator(
                sepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: sepoliaEcdsaModularSigner,
                    policies: [sudoPolicy]
                }
            )

            const optimismSepoliaPermissionPlugin = await toPermissionValidator(
                optimismSepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: optimismSepoliaEcdsaModularSigner,
                    policies: [sudoPolicy]
                }
            )

            const sepoliaKernelAccount = await createKernelAccount(
                sepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    plugins: {
                        sudo: sepoliaMultiChainValidatorPlugin,
                        regular: sepoliaPermissionPlugin
                    }
                }
            )

            const optimismSepoliaKernelAccount = await createKernelAccount(
                optimismSepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    plugins: {
                        sudo: optimismSepoliaMultiChainValidatorPlugin,
                        regular: optimismSepoliaPermissionPlugin
                    }
                }
            )

            console.log(
                "sepoliaKernelAccount.address",
                sepoliaKernelAccount.address
            )
            console.log(
                "optimismSepoliaKernelAccount.address",
                optimismSepoliaKernelAccount.address
            )

            const sepoliaZeroDevPaymasterClient = createZeroDevPaymasterClient({
                chain: sepolia,
                transport: http(SEPOLIA_ZERODEV_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const opSepoliaZeroDevPaymasterClient =
                createZeroDevPaymasterClient({
                    chain: optimismSepolia,
                    transport: http(OPTIMISM_SEPOLIA_ZERODEV_PAYMASTER_RPC_URL),
                    entryPoint: getEntryPoint()
                })

            const sepoliaZerodevKernelClient = createKernelAccountClient({
                account: sepoliaKernelAccount,
                chain: sepolia,
                bundlerTransport: http(SEPOLIA_ZERODEV_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return sepoliaZeroDevPaymasterClient.sponsorUserOperation(
                            {
                                userOperation,
                                entryPoint: getEntryPoint()
                            }
                        )
                    }
                },
                entryPoint: getEntryPoint()
            })

            const optimismSepoliaZerodevKernelClient =
                createKernelAccountClient({
                    account: optimismSepoliaKernelAccount,
                    chain: optimismSepolia,
                    bundlerTransport: http(OPTIMISM_SEPOLIA_ZERODEV_RPC_URL),
                    middleware: {
                        sponsorUserOperation: async ({ userOperation }) => {
                            return opSepoliaZeroDevPaymasterClient.sponsorUserOperation(
                                {
                                    userOperation,
                                    entryPoint: getEntryPoint()
                                }
                            )
                        }
                    },
                    entryPoint: getEntryPoint()
                })

            const sepoliaUserOp =
                await sepoliaZerodevKernelClient.prepareUserOperationRequest({
                    userOperation: {
                        callData: await sepoliaKernelAccount.encodeCallData({
                            to: zeroAddress,
                            value: BigInt(0),
                            data: "0x"
                        })
                    }
                })

            const optimismSepoliaUserOp =
                await optimismSepoliaZerodevKernelClient.prepareUserOperationRequest(
                    {
                        userOperation: {
                            callData:
                                await optimismSepoliaKernelAccount.encodeCallData(
                                    {
                                        to: zeroAddress,
                                        value: BigInt(0),
                                        data: "0x"
                                    }
                                )
                        }
                    }
                )

            const signedEnableUserOps = await signUserOpsWithEnable({
                multiChainUserOpConfigs: [
                    {
                        account: sepoliaKernelAccount,
                        userOp: sepoliaUserOp
                    },
                    {
                        account: optimismSepoliaKernelAccount,
                        userOp: optimismSepoliaUserOp
                    }
                ]
            })

            const sepoliaBundlerClient = sepoliaZerodevKernelClient.extend(
                bundlerActions(getEntryPoint())
            )

            const optimismSepoliaBundlerClient =
                optimismSepoliaZerodevKernelClient.extend(
                    bundlerActions(getEntryPoint())
                )

            console.log("sending sepoliaUserOp")
            const sepoliaUserOpHash =
                await sepoliaZerodevKernelClient.sendSignedUserOperation({
                    userOperation: signedEnableUserOps[0],
                    entryPoint: getEntryPoint()
                })

            console.log("sepoliaUserOpHash", sepoliaUserOpHash)
            await sepoliaBundlerClient.waitForUserOperationReceipt({
                hash: sepoliaUserOpHash
            })

            console.log("sending optimismSepoliaUserOp")
            const optimismSepoliaUserOpHash =
                await optimismSepoliaZerodevKernelClient.sendSignedUserOperation(
                    {
                        userOperation: signedEnableUserOps[1],
                        entryPoint: getEntryPoint()
                    }
                )

            console.log("optimismSepoliaUserOpHash", optimismSepoliaUserOpHash)
            await optimismSepoliaBundlerClient.waitForUserOperationReceipt({
                hash: optimismSepoliaUserOpHash
            })

            const txHash = await sepoliaZerodevKernelClient.sendTransaction({
                to: zeroAddress,
                value: BigInt(0),
                data: "0x"
            })
            console.log("txHash", txHash)
        },
        TEST_TIMEOUT
    )

    test(
        "can enable session key with approval using serialized account",
        async () => {
            const sepoliaPublicClient = createPublicClient({
                transport: http(SEPOLIA_RPC_URL)
            })
            const optimismSepoliaPublicClient = createPublicClient({
                transport: http(OPTIMISM_SEPOLIA_RPC_URL)
            })

            const signer = privateKeyToAccount(PRIVATE_KEY as Hex)
            const sepoliaMultiChainValidatorPlugin =
                await toMultiChainValidator(sepoliaPublicClient, {
                    entryPoint: getEntryPoint(),
                    signer
                })
            const optimismSepoliaMultiChainValidatorPlugin =
                await toMultiChainValidator(optimismSepoliaPublicClient, {
                    entryPoint: getEntryPoint(),
                    signer
                })

            const sepoliaSessionKeyAccount = privateKeyToAccount(
                "0xd53978f1a41e9f149d9e151c11f08edebb80340d2767a086d8bf5c7221064ff9"
            )

            const optimismSepoliaSessionKeyAccount = privateKeyToAccount(
                "0x8d1348978bac94a2f019e80cbf42e8b5427f9a45e579a03ad341103813845696"
            )

            // create an empty account as the session key signer
            const sepoliaEmptyAccount = addressToEmptyAccount(
                sepoliaSessionKeyAccount.address
            )
            const optimismSepoliaEmptyAccount = addressToEmptyAccount(
                optimismSepoliaSessionKeyAccount.address
            )

            const sepoliaEmptySessionKeySigner = toECDSASigner({
                signer: sepoliaEmptyAccount
            })

            const optimismSepoliaEmptySessionKeySigner = toECDSASigner({
                signer: optimismSepoliaEmptyAccount
            })

            const sudoPolicy = toSudoPolicy({})

            // create a permission validator plugin with empty account signer
            const sepoliaPermissionPlugin = await toPermissionValidator(
                sepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: sepoliaEmptySessionKeySigner,
                    policies: [sudoPolicy]
                }
            )

            const optimismSepoliaPermissionPlugin = await toPermissionValidator(
                optimismSepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer: optimismSepoliaEmptySessionKeySigner,
                    policies: [sudoPolicy]
                }
            )

            const sepoliaKernelAccount = await createKernelAccount(
                sepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    plugins: {
                        sudo: sepoliaMultiChainValidatorPlugin,
                        regular: sepoliaPermissionPlugin
                    }
                }
            )

            const optimismSepoliaKernelAccount = await createKernelAccount(
                optimismSepoliaPublicClient,
                {
                    entryPoint: getEntryPoint(),
                    plugins: {
                        sudo: optimismSepoliaMultiChainValidatorPlugin,
                        regular: optimismSepoliaPermissionPlugin
                    }
                }
            )

            console.log(
                "sepoliaKernelAccount.address",
                sepoliaKernelAccount.address
            )
            console.log(
                "optimismSepoliaKernelAccount.address",
                optimismSepoliaKernelAccount.address
            )

            // serialize multi chain permission account with empty account signer, so get approvals
            const [sepoliaApproval, optimismSepoliaApproval] =
                await serializeMultiChainPermissionAccounts([
                    {
                        account: sepoliaKernelAccount
                    },
                    {
                        account: optimismSepoliaKernelAccount
                    }
                ])

            // get real session key signers
            const sepoliaSessionKeySigner = toECDSASigner({
                signer: sepoliaSessionKeyAccount
            })

            const optimismSepoliaSessionKeySigner = toECDSASigner({
                signer: optimismSepoliaSessionKeyAccount
            })

            // deserialize the permission account with the real session key signers
            const deserializeSepoliaKernelAccount =
                await deserializePermissionAccount(
                    sepoliaPublicClient,
                    getEntryPoint(),
                    sepoliaApproval,
                    sepoliaSessionKeySigner
                )

            const deserializeOptimismSepoliaKernelAccount =
                await deserializePermissionAccount(
                    optimismSepoliaPublicClient,
                    getEntryPoint(),
                    optimismSepoliaApproval,
                    optimismSepoliaSessionKeySigner
                )

            const sepoliaZeroDevPaymasterClient = createZeroDevPaymasterClient({
                chain: sepolia,
                transport: http(SEPOLIA_ZERODEV_PAYMASTER_RPC_URL),
                entryPoint: getEntryPoint()
            })

            const opSepoliaZeroDevPaymasterClient =
                createZeroDevPaymasterClient({
                    chain: optimismSepolia,
                    transport: http(OPTIMISM_SEPOLIA_ZERODEV_PAYMASTER_RPC_URL),
                    entryPoint: getEntryPoint()
                })

            // create a kernel account client with the deserialized account
            const sepoliaZerodevKernelClient = createKernelAccountClient({
                account: deserializeSepoliaKernelAccount,
                chain: sepolia,
                bundlerTransport: http(SEPOLIA_ZERODEV_RPC_URL),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return sepoliaZeroDevPaymasterClient.sponsorUserOperation(
                            {
                                userOperation,
                                entryPoint: getEntryPoint()
                            }
                        )
                    }
                },
                entryPoint: getEntryPoint()
            })

            const optimismSepoliaZerodevKernelClient =
                createKernelAccountClient({
                    account: deserializeOptimismSepoliaKernelAccount,
                    chain: optimismSepolia,
                    bundlerTransport: http(OPTIMISM_SEPOLIA_ZERODEV_RPC_URL),
                    middleware: {
                        sponsorUserOperation: async ({ userOperation }) => {
                            return opSepoliaZeroDevPaymasterClient.sponsorUserOperation(
                                {
                                    userOperation,
                                    entryPoint: getEntryPoint()
                                }
                            )
                        }
                    },
                    entryPoint: getEntryPoint()
                })

            // send user ops. you don't need additional enables, since it already has the approvals with serialized account
            const sepoliaTxHash =
                await sepoliaZerodevKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: BigInt(0),
                    data: "0x"
                })

            console.log("sepoliaTxHash", sepoliaTxHash)

            const optimismSepoliaTxHash =
                await optimismSepoliaZerodevKernelClient.sendTransaction({
                    to: zeroAddress,
                    value: BigInt(0),
                    data: "0x"
                })

            console.log("optimismSepoliaTxHash", optimismSepoliaTxHash)
        },
        TEST_TIMEOUT
    )
})
