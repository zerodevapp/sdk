// @ts-expect-error
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
    type KernelSmartAccount,
    KernelV3ExecuteAbi,
    createKernelAccount,
    getCustomNonceKeyFromString,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import dotenv from "dotenv"
import { ethers } from "ethers"
import {
    type BundlerClient,
    ENTRYPOINT_ADDRESS_V07,
    bundlerActions
} from "permissionless"
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import type { PimlicoBundlerClient } from "permissionless/clients/pimlico.js"
import type { EntryPoint } from "permissionless/types/entrypoint.js"
import {
    type Address,
    type Chain,
    type GetContractReturnType,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    type Transport,
    decodeEventLog,
    decodeFunctionData,
    encodeFunctionData,
    erc20Abi,
    getContract,
    hashMessage,
    hashTypedData,
    zeroAddress
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { toSpendingLimitHook } from "../../../plugins/hooks/toSpendingLimitHook.js"
import { toSudoPolicy } from "../../../plugins/permission/policies/toSudoPolicy.js"
import { toECDSASigner } from "../../../plugins/permission/signers/toECDSASigner.js"
import { toPermissionValidator } from "../../../plugins/permission/toPermissionValidator.js"
import { EntryPointAbi } from "../abis/EntryPoint.js"
import { GreeterAbi, GreeterBytecode } from "../abis/Greeter.js"
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi.js"
import { TokenActionsAbi } from "../abis/TokenActionsAbi.js"
import { TOKEN_ACTION_ADDRESS, config } from "../config.js"
import { Test_ERC20Address } from "../utils.js"
import {
    findUserOperationEvent,
    getEcdsaKernelAccountWithRandomSigner,
    getEntryPoint,
    getKernelAccountClient,
    getPimlicoBundlerClient,
    getPublicClient,
    getSignerToEcdsaKernelAccount,
    getZeroDevPaymasterClient,
    index,
    mintToAccount,
    validateEnvironmentVariables,
    waitForNonceUpdate
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

validateEnvironmentVariables(requiredEnvVars)

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("Spending Limit Hook", () => {
    let accountWithSudo: KernelSmartAccount<EntryPoint>
    let accountWithRegular: KernelSmartAccount<EntryPoint>
    let ownerAccount1: PrivateKeyAccount
    let ownerAccount2: PrivateKeyAccount
    let publicClient: PublicClient
    let kernelClientWithSudo: KernelAccountClient<
        EntryPoint,
        Transport,
        Chain,
        KernelSmartAccount<EntryPoint>
    >
    let kernelClientWithRegular: KernelAccountClient<
        EntryPoint,
        Transport,
        Chain,
        KernelSmartAccount<EntryPoint>
    >

    beforeAll(async () => {
        // const ownerPrivateKey = process.env.TEST_PRIVATE_KEY
        // const ownerPrivateKey =
        //     "0x7630514d0cd998019c9cd4ee19a0048d6451c821ccf7927ae5e29a67104a3d92"
        const ownerPrivateKey1 = generatePrivateKey()
        const ownerPrivateKey2 = generatePrivateKey()
        publicClient = await getPublicClient()
        ownerAccount1 = privateKeyToAccount(ownerPrivateKey1)
        ownerAccount2 = privateKeyToAccount(ownerPrivateKey2)

        const ecdsaValidatorPlugin1 = await signerToEcdsaValidator(
            publicClient,
            {
                signer: ownerAccount1,
                entryPoint: getEntryPoint()
            }
        )

        const ecdsaValidatorPlugin2 = await signerToEcdsaValidator(
            publicClient,
            {
                signer: ownerAccount2,
                entryPoint: getEntryPoint()
            }
        )

        const ecdsaSigner = await toECDSASigner({
            signer: ownerAccount2
        })

        const sudoPolicy = await toSudoPolicy({})

        const permissoinPlugin = await toPermissionValidator(publicClient, {
            signer: ecdsaSigner,
            policies: [sudoPolicy],
            entryPoint: getEntryPoint()
        })

        const spendingLimitHook = await toSpendingLimitHook({
            limits: [{ token: Test_ERC20Address, allowance: BigInt(4337) }]
        })

        accountWithSudo = await createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            plugins: {
                sudo: ecdsaValidatorPlugin1,
                hook: spendingLimitHook
            }
        })

        accountWithRegular = await createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            plugins: {
                sudo: ecdsaValidatorPlugin2,
                regular: permissoinPlugin,
                hook: spendingLimitHook
            }
        })

        console.log("accountWithSudo", accountWithSudo.address)
        console.log("accountWithRegular", accountWithRegular.address)

        kernelClientWithSudo = await getKernelAccountClient({
            account: accountWithSudo,
            middleware: {
                sponsorUserOperation: async ({ userOperation }) => {
                    const zeroDevPaymaster = getZeroDevPaymasterClient()
                    return zeroDevPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint: getEntryPoint()
                    })
                }
            }
        })

        kernelClientWithRegular = await getKernelAccountClient({
            account: accountWithRegular,
            middleware: {
                sponsorUserOperation: async ({ userOperation }) => {
                    const zeroDevPaymaster = getZeroDevPaymasterClient()
                    return zeroDevPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint: getEntryPoint()
                    })
                }
            }
        })

        const amountToMint = 10000n
        await mintToAccount(
            publicClient,
            kernelClientWithSudo,
            kernelClientWithSudo.account.address,
            amountToMint
        )
        await mintToAccount(
            publicClient,
            kernelClientWithRegular,
            kernelClientWithRegular.account.address,
            amountToMint
        )
    })

    test(
        "Account with sudo validator can't send a ERC20 trnasfer transaction exceeding the allowance of spending limit hook",
        async () => {
            const amountToTransfer = 10000n
            const transferData = encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [ownerAccount1.address, amountToTransfer]
            })

            await expect(
                kernelClientWithSudo.sendTransaction({
                    to: Test_ERC20Address,
                    data: transferData
                })
            ).rejects.toThrow()
        },
        TEST_TIMEOUT
    )

    test(
        "Account with sudo validator can send a ERC20 transfer transaction with a spending limit hook",
        async () => {
            const amountToTransfer = 4337n
            const transferData = encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [ownerAccount1.address, amountToTransfer]
            })

            const response = await kernelClientWithSudo.sendTransaction({
                to: Test_ERC20Address,
                data: transferData
            })

            expect(response).toBeString()
            expect(response).toHaveLength(66)
            expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)
        },
        TEST_TIMEOUT
    )

    test(
        "Account with sudo validator can't send a ERC20 transfer transaction after using all allowance of spending limit hook",
        async () => {
            const amountToTransfer = 4337n
            const transferData = encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [ownerAccount1.address, amountToTransfer]
            })

            await expect(
                kernelClientWithSudo.sendTransaction({
                    to: Test_ERC20Address,
                    data: transferData
                })
            ).rejects.toThrow()
        },
        TEST_TIMEOUT
    )

    test(
        "Account with regular validator can't send a ERC20 trnasfer transaction exceeding the allowance of spending limit hook",
        async () => {
            const amountToTransfer = 10000n
            const transferData = encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [ownerAccount2.address, amountToTransfer]
            })

            await expect(
                kernelClientWithRegular.sendTransaction({
                    to: Test_ERC20Address,
                    data: transferData
                })
            ).rejects.toThrow()
        },
        TEST_TIMEOUT
    )

    test(
        "Account with regular validator can send a ERC20 transfer transaction with a spending limit hook",
        async () => {
            const amountToTransfer = 4337n
            const transferData = encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [ownerAccount2.address, amountToTransfer]
            })

            const response = await kernelClientWithRegular.sendTransaction({
                to: Test_ERC20Address,
                data: transferData
            })

            expect(response).toBeString()
            expect(response).toHaveLength(66)
            expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)
        },
        TEST_TIMEOUT
    )

    test(
        "Account with regular validator can't send a ERC20 transfer transaction after using all allowance of spending limit hook",
        async () => {
            const amountToTransfer = 4337n
            const transferData = encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [ownerAccount2.address, amountToTransfer]
            })

            await expect(
                kernelClientWithRegular.sendTransaction({
                    to: Test_ERC20Address,
                    data: transferData
                })
            ).rejects.toThrow()
        },
        TEST_TIMEOUT
    )
})
