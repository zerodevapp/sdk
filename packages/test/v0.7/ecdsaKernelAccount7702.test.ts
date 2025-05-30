import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    create7702KernelAccount,
    create7702KernelAccountClient
} from "@zerodev/ecdsa-validator"
import {
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { getUserOperationGasPrice } from "@zerodev/sdk/actions"
import dotenv from "dotenv"
import {
    http,
    type Address,
    type Chain,
    type GetContractReturnType,
    type Hex,
    type LocalAccount,
    type PrivateKeyAccount,
    type PublicClient,
    type Transport,
    type WalletClient,
    createPublicClient,
    createWalletClient,
    encodeFunctionData,
    getContract
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { bsc, holesky, sepolia } from "viem/chains"
import { GreeterAbi } from "../abis/Greeter.js"

import {
    KERNEL_7702_DELEGATION_ADDRESS,
    KernelVersionToAddressesMap,
    getEntryPoint
} from "@zerodev/sdk/constants"
import {
    type SmartAccount,
    entryPoint07Address
} from "viem/account-abstraction"
import { generatePrivateKey } from "viem/accounts"
import { prepareAuthorization, signAuthorization } from "viem/actions"
import {
    kernelVersion,
    validateEnvironmentVariables,
    waitForNonceUpdate
} from "./utils/common.js"

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

const chain = sepolia
validateEnvironmentVariables(requiredEnvVars)

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000
const projectId = process.env.PROJECT_ID
const bundlerRpc = `https://rpc.zerodev.app/api/v3/${projectId}/chain/${chain.id}`
const paymasterRpc = `https://rpc.zerodev.app/api/v3/${projectId}/chain/${chain.id}`
const publicClient = createPublicClient({
    transport: http(bundlerRpc),
    chain: chain
})
const entryPoint = getEntryPoint("0.7")
describe("ECDSA kernel Account", () => {
    let account: SmartAccount<KernelSmartAccountImplementation>
    let ownerAccount: PrivateKeyAccount
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
    beforeAll(async () => {
        const randomKey = generatePrivateKey()
        ownerAccount = privateKeyToAccount(randomKey)
        console.log("ownerAccount", ownerAccount.address)
        //console.log("privateKey", ownerPrivateKey)
        console.log(
            "KERNEL_7702_DELEGATION_ADDRESS",
            KERNEL_7702_DELEGATION_ADDRESS
        )
        const account = await createKernelAccount(publicClient, {
            eip7702Account: ownerAccount,
            entryPoint,
            kernelVersion
        })

        const paymasterClient = createZeroDevPaymasterClient({
            chain: chain,
            transport: http(paymasterRpc)
        })
        kernelClient = createKernelAccountClient({
            account,
            chain: chain,
            bundlerTransport: http(bundlerRpc),
            paymaster: {
                getPaymasterData: async (userOperation) => {
                    return await paymasterClient.sponsorUserOperation({
                        userOperation
                    })
                }
            },
            client: publicClient,
            userOperation: {
                estimateFeesPerGas: async ({ bundlerClient }) => {
                    return getUserOperationGasPrice(bundlerClient)
                }
            }
        })
        greeterContract = getContract({
            abi: GreeterAbi,
            address: process.env.GREETER_ADDRESS as Address,
            client: kernelClient
        })
    })

    test(
        "Client signs and then sends UserOp with paymaster",
        async () => {
            const userOpHash = await kernelClient.sendUserOperation({
                callData: await kernelClient.account.encodeCalls([
                    {
                        to: process.env.GREETER_ADDRESS as Address,
                        value: 0n,
                        data: encodeFunctionData({
                            abi: GreeterAbi,
                            functionName: "setGreeting",
                            args: ["hello world 3"]
                        })
                    },
                    {
                        to: process.env.GREETER_ADDRESS as Address,
                        value: 0n,
                        data: encodeFunctionData({
                            abi: GreeterAbi,
                            functionName: "setGreeting",
                            args: ["hello world 4"]
                        })
                    }
                ])
            })
            expect(userOpHash).toHaveLength(66)
            const receipt = await kernelClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
            console.log("userOpHash", userOpHash)
            console.log("receipt", receipt)

            await waitForNonceUpdate()

            const greet = await greeterContract.read.greet()
            expect(greet).toBeString()
            expect(greet).toEqual("hello world 4")
        },
        TEST_TIMEOUT
    )
})
