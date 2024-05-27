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

describe("ECDSA kernel Account", () => {
    let account: KernelSmartAccount<EntryPoint>
    let ownerAccount: PrivateKeyAccount
    let publicClient: PublicClient
    let bundlerClient: BundlerClient<EntryPoint>
    let kernelClient: KernelAccountClient<
        EntryPoint,
        Transport,
        Chain,
        KernelSmartAccount<EntryPoint>
    >
    let owner: Address

    beforeAll(async () => {
        // const ownerPrivateKey = process.env.TEST_PRIVATE_KEY
        const ownerPrivateKey =
            "0x7630514d0cd998019c9cd4ee19a0048d6451c821ccf7927ae5e29a67104a3d91"
        publicClient = await getPublicClient()
        if (!ownerPrivateKey) {
            throw new Error("TEST_PRIVATE_KEY is not set")
        }
        ownerAccount = privateKeyToAccount(ownerPrivateKey as Hex)
        const ecdsaValidatorPlugin = await signerToEcdsaValidator(
            publicClient,
            {
                signer: ownerAccount,
                entryPoint: getEntryPoint()
            }
        )

        const ecdsaSigner = await toECDSASigner({
            signer: ownerAccount
        })

        const sudoPolicy = await toSudoPolicy({})

        const permissoinPlugin = await toPermissionValidator(publicClient, {
            signer: ecdsaSigner,
            policies: [sudoPolicy],
            entryPoint: getEntryPoint()
        })

        const spendingLimitHook = await toSpendingLimitHook({
            limits: [{ token: zeroAddress, allowance: BigInt(10000) }]
        })
        console.log("spendingLimitHook", spendingLimitHook.getIdentifier())

        account = await createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            plugins: {
                sudo: ecdsaValidatorPlugin,
                regular: permissoinPlugin,
                hook: spendingLimitHook
            }
        })

        console.log("account", account.address)

        owner = privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex).address
        kernelClient = await getKernelAccountClient({
            account
            // middleware: {
            //     sponsorUserOperation: async ({ userOperation }) => {
            //         const zeroDevPaymaster = getZeroDevPaymasterClient()
            //         return zeroDevPaymaster.sponsorUserOperation({
            //             userOperation,
            //             entryPoint: getEntryPoint()
            //         })
            //     }
            // }
        })
        bundlerClient = kernelClient.extend(bundlerActions(getEntryPoint()))
    })

    test(
        "test hook",
        async () => {
            const txHash = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: BigInt(0),
                data: "0x"
            })
            console.log("txHash", txHash)
        },
        TEST_TIMEOUT
    )
})
