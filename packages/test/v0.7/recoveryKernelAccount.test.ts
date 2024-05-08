// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { kernelVersionToEcdsaValidatorMap } from "@zerodev/ecdsa-validator/constants.js"
import type { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk"
import dotenv from "dotenv"
import { type BundlerClient, bundlerActions } from "permissionless"
import type { EntryPoint } from "permissionless/types/entrypoint.js"
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
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getRecoveryKernelAccount,
    getZeroDevPaymasterClient,
    kernelVersion
} from "./utils.js"

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
const recoveryExecutorFunction =
    "function doRecovery(address _validator, bytes calldata _data)"
describe("Recovery kernel Account", () => {
    let recoveryAccount: KernelSmartAccount<EntryPoint>
    let publicClient: PublicClient
    let bundlerClient: BundlerClient<EntryPoint>
    let recoveryKernelClient: KernelAccountClient<
        EntryPoint,
        Transport,
        Chain,
        KernelSmartAccount<EntryPoint>
    >
    let accountAddress: Address
    let newSigner: PrivateKeyAccount

    beforeAll(async () => {
        publicClient = await getPublicClient()
        const newSignerPrivateKey = generatePrivateKey()
        newSigner = privateKeyToAccount(newSignerPrivateKey)

        recoveryAccount = await getRecoveryKernelAccount()
        accountAddress = recoveryAccount.address
        recoveryKernelClient = await getKernelAccountClient({
            account: recoveryAccount,
            middleware: {
                sponsorUserOperation: async ({ userOperation, entryPoint }) => {
                    const zerodevPaymaster = getZeroDevPaymasterClient()
                    return zerodevPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint
                    })
                }
            }
        })

        bundlerClient = recoveryKernelClient.extend(
            bundlerActions(getEntryPoint())
        )
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
                userOperation: {
                    callData: encodeFunctionData({
                        abi: parseAbi([recoveryExecutorFunction]),
                        functionName: "doRecovery",
                        args: [
                            kernelVersionToEcdsaValidatorMap[kernelVersion],
                            newSigner.address
                        ]
                    }),
                    preVerificationGas: 84700n,
                    callGasLimit: 1273781n,
                    verificationGasLimit: 726789n
                }
            })
            console.log("userOpHash:", userOpHash)

            expect(userOpHash).toHaveLength(66)

            const transactionReceipt =
                await bundlerClient.waitForUserOperationReceipt({
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
                userOperation: {
                    callData: encodeFunctionData({
                        abi: parseAbi([recoveryExecutorFunction]),
                        functionName: "doRecovery",
                        args: [
                            kernelVersionToEcdsaValidatorMap[kernelVersion],
                            newSigner.address
                        ]
                    })
                }
            })
            console.log("userOpHash:", userOpHash)

            expect(userOpHash).toHaveLength(66)

            const transactionReceipt =
                await bundlerClient.waitForUserOperationReceipt({
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
