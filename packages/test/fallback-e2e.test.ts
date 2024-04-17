// @ts-expect-error
import { describe, test } from "bun:test"
import {
    createFallbackTransport,
    createKernelAccount,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { http, createPublicClient, zeroAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import { getEntryPoint } from "./utils"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { createKernelAccountClient } from "@zerodev/sdk"
import { createPimlicoPaymasterClient } from "permissionless/clients/pimlico"

const TEST_TIMEOUT = 1000000

describe("fallback e2e test", () => {
    test(
        "default",
        async () => {
            // @dev Specify urls for testing various fallback scenarios
            const RPC_URL =
                "https://sepolia.infura.io/v3/f36f7f706a58477884ce6fe89165666c"

            const BUNDLER_SERVER_URL_1 =
                "https://rpc.zerodev.app/api/v2/bundler/efbc1add-1c14-476e-b3f1-206db80e673c?bundlerProvider=PIMLICO"
            const BUNDLER_SERVER_URL_2 =
                "https://api.pimlico.io/v2/11155111/rpc?apikey=dcdd16bf-1513-4170-bf8c-a83f33d7dcce"
            const BUNDLER_SERVER_URL_3 =
                "https://api.stackup.sh/v1/node/2cb60b8a2e01c177857b8d9268a979cf3306a8ae497780a6faaddc43b1b444e6"

            const PAYMASTER_SERVER_URL_1 =
                "https://rpc.zerodev.app/api/v2/paymaster/efbc1add-1c14-476e-b3f1-206db80e673c?paymasterProvider=PIMLICO"
            const PAYMASTER_SERVER_URL_2 =
                "https://api.pimlico.io/v2/11155111/rpc?apikey=dcdd16bf-1513-4170-bf8c-a83f33d7dcce"
            const PAYMASTER_SERVER_URL_3 =
                "https://api.stackup.sh/v1/paymaster/2cb60b8a2e01c177857b8d9268a979cf3306a8ae497780a6faaddc43b1b444e6"

            const bundlerHttpServer1 = http(BUNDLER_SERVER_URL_1)
            const paymasterHttpServer1 = http(PAYMASTER_SERVER_URL_1)

            const bundlerHttpServer2 = http(BUNDLER_SERVER_URL_2)
            const paymasterHttpServer2 = http(PAYMASTER_SERVER_URL_2)

            const bundlerHttpServer3 = http(BUNDLER_SERVER_URL_3)
            const paymasterHttpServer3 = http(PAYMASTER_SERVER_URL_3)

            const { bundlerFallbackTransport, paymasterFallbackTransport } =
                createFallbackTransport([
                    {
                        bundlerTransport: bundlerHttpServer1,
                        paymasterTransport: paymasterHttpServer1
                    },
                    {
                        bundlerTransport: bundlerHttpServer2,
                        paymasterTransport: paymasterHttpServer2
                    },
                    {
                        bundlerTransport: bundlerHttpServer3,
                        paymasterTransport: paymasterHttpServer3
                    }
                ])

            const publicClient = createPublicClient({
                transport: http(RPC_URL)
            })

            const a = http(RPC_URL)({ chain: sepolia })
            const b = bundlerFallbackTransport({ chain: sepolia })
            console.log("http(RPC_URL)", a)
            console.log("bundlerFallbackTransport", b)

            const paymasterClient = createZeroDevPaymasterClient({
                chain: sepolia,
                transport: paymasterFallbackTransport,
                entryPoint: getEntryPoint()
            })

            const signer = privateKeyToAccount(generatePrivateKey())
            const ecdsaValidatorPlugin = await signerToEcdsaValidator(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer
                }
            )

            const kernelAccount = await createKernelAccount(publicClient, {
                entryPoint: getEntryPoint(),
                plugins: {
                    sudo: ecdsaValidatorPlugin
                }
            })

            const kernelClient = createKernelAccountClient({
                account: kernelAccount,
                chain: sepolia,
                bundlerTransport: bundlerFallbackTransport,
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        return paymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            const userOpHash = await kernelClient.sendUserOperation({
                userOperation: {
                    callData: await kernelClient.account.encodeCallData({
                        to: zeroAddress,
                        value: 0n,
                        data: "0x"
                    })
                }
            })

            console.log("userOpHash", userOpHash)
        },
        TEST_TIMEOUT
    )
})
