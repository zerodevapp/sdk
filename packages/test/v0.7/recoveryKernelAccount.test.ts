// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { getValidatorAddress } from "@zerodev/ecdsa-validator/index.js"
import type {
    KernelAccountClient,
    KernelSmartAccountImplementation,
    ZeroDevPaymasterClient
} from "@zerodev/sdk"
import dotenv from "dotenv"
import {
    type Address,
    type Chain,
    type PrivateKeyAccount,
    type PublicClient,
    type Transport,
    encodeFunctionData,
    parseAbi,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getRecoveryKernelAccount,
    getZeroDevPaymasterClient,
    kernelVersion,
    validateEnvironmentVariables
} from "./utils"

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
const TEST_TIMEOUT = 1000000
const recoveryExecutorFunction =
    "function doRecovery(address _validator, bytes calldata _data)"
describe("Recovery kernel Account", () => {
    let recoveryAccount: SmartAccount<KernelSmartAccountImplementation>
    let recoveryKernelClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >
    let accountAddress: Address
    let newSigner: PrivateKeyAccount
    let zeroDevPaymaster: ZeroDevPaymasterClient

    beforeAll(async () => {
        const newSignerPrivateKey = generatePrivateKey()
        newSigner = privateKeyToAccount(newSignerPrivateKey)

        recoveryAccount = await getRecoveryKernelAccount()
        accountAddress = recoveryAccount.address
        zeroDevPaymaster = getZeroDevPaymasterClient()
        recoveryKernelClient = await getKernelAccountClient({
            account: recoveryAccount,
            paymaster: zeroDevPaymaster
        })
    })

    test("Account address should be a valid Ethereum address", async () => {
        expect(recoveryAccount.address).toBeString()
        expect(recoveryAccount.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(recoveryAccount.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(recoveryAccount.address).not.toEqual(zeroAddress)
    })

    test(
        "Recover the account",
        async () => {
            const userOpHash = await recoveryKernelClient.sendUserOperation({
                callData: encodeFunctionData({
                    abi: parseAbi([recoveryExecutorFunction]),
                    functionName: "doRecovery",
                    args: [
                        getValidatorAddress(getEntryPoint(), kernelVersion),
                        newSigner.address
                    ]
                })
            })
            console.log("userOpHash:", userOpHash)

            expect(userOpHash).toHaveLength(66)

            const transactionReceipt =
                await recoveryKernelClient.waitForUserOperationReceipt({
                    hash: userOpHash
                })
            console.log(
                "recoveryTransactionLink",
                `https://sepolia.etherscan.io/tx/${transactionReceipt.receipt.transactionHash}`
            )
        },
        TEST_TIMEOUT
    )

    test(
        "Send the tx with new Signer",
        async () => {
            const userOpHash = await recoveryKernelClient.sendUserOperation({
                callData: encodeFunctionData({
                    abi: parseAbi([recoveryExecutorFunction]),
                    functionName: "doRecovery",
                    args: [
                        getValidatorAddress(getEntryPoint(), kernelVersion),
                        newSigner.address
                    ]
                })
            })
            console.log("userOpHash:", userOpHash)

            expect(userOpHash).toHaveLength(66)

            const transactionReceipt =
                await recoveryKernelClient.waitForUserOperationReceipt({
                    hash: userOpHash
                })
            console.log(
                "recoveryTransactionLink",
                `https://sepolia.etherscan.io/tx/${transactionReceipt.receipt.transactionHash}`
            )
        },
        TEST_TIMEOUT
    )
})
