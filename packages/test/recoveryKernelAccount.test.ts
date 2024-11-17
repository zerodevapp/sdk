// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import type {
    KernelAccountClient,
    KernelSmartAccountImplementation,
    ZeroDevPaymasterClient
} from "@zerodev/sdk"
import dotenv from "dotenv"
import {
    type Chain,
    type PublicClient,
    type Transport,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { generatePrivateKey } from "viem/accounts"
import {
    getEcdsaKernelAccountWithPrivateKey,
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getRecoveryKernelAccount,
    getZeroDevPaymasterClient
} from "./utils_0_6"

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

const validateEnvironmentVariables = (envVars: string[]): void => {
    const unsetEnvVars = envVars.filter((envVar) => !process.env[envVar])
    if (unsetEnvVars.length > 0) {
        throw new Error(
            `The following environment variables are not set: ${unsetEnvVars.join(
                ", "
            )}`
        )
    }
}

validateEnvironmentVariables(requiredEnvVars)

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const TEST_TIMEOUT = 1000000

describe("Recovery kernel Account", () => {
    let ownerAccount: SmartAccount<KernelSmartAccountImplementation<"0.6">>
    let recoveryAccount: SmartAccount<KernelSmartAccountImplementation<"0.6">>
    let publicClient: PublicClient
    let ownerKernelClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation<"0.6">>
    >
    let zeroDevPaymaster: ZeroDevPaymasterClient

    beforeAll(async () => {
        publicClient = await getPublicClient()
        const ownerPrivateKey = generatePrivateKey()
        ownerAccount =
            await getEcdsaKernelAccountWithPrivateKey(ownerPrivateKey)

        zeroDevPaymaster = getZeroDevPaymasterClient()
        recoveryAccount = await getRecoveryKernelAccount(ownerAccount.address)
        ownerKernelClient = await getKernelAccountClient({
            account: ownerAccount,
            paymaster: zeroDevPaymaster
        })
    })

    test("Account address should be a valid Ethereum address", async () => {
        expect(ownerAccount.address).toBeString()
        expect(ownerAccount.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(ownerAccount.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(ownerAccount.address).not.toEqual(zeroAddress)
    })

    test(
        "enable recovery",
        async () => {
            console.log("Deploying the Owner Kernel Account")
            const txHash = await ownerKernelClient.sendTransaction({
                to: zeroAddress
            })
            console.log(
                `✅ Owner account Deployed {accountAddress: ${ownerAccount.address}}, txHash:`,
                txHash
            )
            const userOpHash = await ownerKernelClient.sendUserOperation({
                callData: await recoveryAccount.encodeModuleInstallCallData()
            })
            console.log("userOpHash:", userOpHash)

            expect(userOpHash).toHaveLength(66)

            const transactionReceipt =
                await ownerKernelClient.waitForUserOperationReceipt({
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
