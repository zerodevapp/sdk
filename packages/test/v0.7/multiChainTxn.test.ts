// @ts-expect-error
import { describe, test } from "bun:test"
import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { bundlerActions } from "permissionless"
import { http, type Hex, createPublicClient, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { optimismSepolia, sepolia } from "viem/chains"
import { signUserOps } from "../../../plugins/multichain/signUserOps"
import { toMultiChainValidator } from "../../../plugins/multichain/toMultiChainValidator"
import { getEntryPoint } from "./utils"

const TEST_TIMEOUT = 1000000

describe("multiChainTxn", () => {
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
        "default",
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
})
