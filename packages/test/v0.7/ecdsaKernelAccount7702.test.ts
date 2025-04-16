import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import {
    signerToEcdsaValidator
} from "@zerodev/ecdsa-validator"
import {
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    createKernelAccount,
    createZeroDevPaymasterClient,
    createKernelAccountClient
} from "@zerodev/sdk"
import {
    getUserOperationGasPrice,
} from "@zerodev/sdk/actions"
import dotenv from "dotenv"
import {
    http,
    type Address,
    type Chain,
    type GetContractReturnType,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    type Transport,
    createPublicClient,
    createWalletClient,
    encodeFunctionData,
    getContract,
} from "viem"
import { bsc } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import { GreeterAbi } from "../abis/Greeter.js"

import {
    KERNEL_7702_DELEGATION_ADDRESS,
    getEntryPoint
} from "@zerodev/sdk/constants"
import type { PluginMigrationData } from "@zerodev/sdk/types"
import {
    type SmartAccount,
    entryPoint07Address
} from "viem/account-abstraction"
import {
    type Authorization
} from "viem"
import {
    signAuthorization,
    prepareAuthorization
} from "viem/actions"
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

validateEnvironmentVariables(requiredEnvVars)

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000
const projectId = process.env.PROJECT_ID
const bundlerRpc = `https://rpc.zerodev.app/api/v2/bundler/${projectId}?provider=PIMLICO`
const paymasterRpc = `https://api.pimlico.io/v2/binance/rpc?apikey=6dbca556-d64c-4469-b8f6-dca03f9f373e`
const publicClient = createPublicClient({
    transport: http(bundlerRpc),
    chain: bsc
})
const entryPoint = getEntryPoint("0.7")
describe("ECDSA kernel Account", () => {
    let account: SmartAccount<KernelSmartAccountImplementation>
    let ownerAccount: PrivateKeyAccount
    let walletClient: WalletClient
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
    let authorization : Authorization
    beforeAll(async () => {
        const ownerPrivateKey = process.env.TEST_PRIVATE_KEY
        if (!ownerPrivateKey) {
            throw new Error("TEST_PRIVATE_KEY is not set")
        }
        ownerAccount = privateKeyToAccount(ownerPrivateKey as Hex)
        console.log("ownerAccount", ownerAccount.address)
        owner = ownerAccount.address
        walletClient = createWalletClient({
            account: ownerAccount,
            chain: bsc,
            transport: http()
        })
        authorization = await signAuthorization(walletClient, {
            account : ownerAccount,
            address : KERNEL_7702_DELEGATION_ADDRESS,
            sponsor : true
        })
        console.log("AA-11")
        console.log(authorization)
        console.log(KERNEL_7702_DELEGATION_ADDRESS)
        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
            signer: ownerAccount,
            entryPoint,
            kernelVersion
        })
        console.log("BB")
        const account = await createKernelAccount(publicClient, {
            plugins: {
                sudo: ecdsaValidator
            },
            entryPoint,
            kernelVersion,
            // Set the address of the smart account to the EOA address
            address: ownerAccount.address,
            // Set the 7702 authorization
            //eip7702Auth: authorization
        })

        const paymasterClient = createZeroDevPaymasterClient({
            chain: bsc,
            transport: http(paymasterRpc)
        })
        kernelClient = createKernelAccountClient({
            account,
            chain: bsc,
            bundlerTransport: http(bundlerRpc),
            paymaster: paymasterClient,
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
            const userOp = await kernelClient.signUserOperation({
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
                ]),
                authorization : authorization
            })
            expect(userOp.signature).not.toBe("0x")

            const userOpHash = await kernelClient.sendUserOperation({
                ...userOp,
                authorization : authorization
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
