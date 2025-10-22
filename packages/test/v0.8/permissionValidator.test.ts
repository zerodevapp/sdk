import { beforeAll, describe, expect, test } from "bun:test"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    GAS_POLICY_CONTRACT,
    type Policy,
    SUDO_POLICY_CONTRACT,
    toInitConfig,
    toPermissionValidator
} from "@zerodev/permissions"
import { toGasPolicy, toSudoPolicy } from "@zerodev/permissions/policies"
import { toECDSASigner } from "@zerodev/permissions/signers"
import {
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    createKernelAccount
} from "@zerodev/sdk"
import {
    type Chain,
    type Hex,
    type PublicClient,
    type Transport,
    parseEther,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import {
    type PrivateKeyAccount,
    generatePrivateKey,
    privateKeyToAccount
} from "viem/accounts"
import {
    defaultKernelVersion,
    getEntryPoint,
    getPublicClient,
    getTestingChain
} from "./utils/common"
import {
    getEcdsaKernelAccountWithPrivateKey,
    getKernelAccountClient
} from "./utils/ecdsaUtils"
import { getSignerToRootPermissionKernelAccount } from "./utils/permissionUtils"

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 144
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{142}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("Permission kernel Account v0.8", () => {
    let account: SmartAccount<KernelSmartAccountImplementation<"0.8">>
    let ownerAccount: PrivateKeyAccount
    let publicClient: PublicClient
    let ecdsaSmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation<"0.8">>
    >
    let permissionSmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation<"0.8">>
    >
    let gasPolicy: Policy

    beforeAll(async () => {
        const testPrivateKey = process.env.TEST_PRIVATE_KEY as Hex
        ownerAccount = privateKeyToAccount(testPrivateKey)
        publicClient = await getPublicClient()

        account = await getEcdsaKernelAccountWithPrivateKey({
            privateKey: testPrivateKey
        })
        ecdsaSmartAccountClient = await getKernelAccountClient({
            account
        })
        gasPolicy = toGasPolicy({
            allowed: parseEther("10"),
            policyAddress: GAS_POLICY_CONTRACT
        })
        const sudoPolicy = await toSudoPolicy({
            policyAddress: SUDO_POLICY_CONTRACT
        })

        permissionSmartAccountClient = await getKernelAccountClient({
            account: await getSignerToRootPermissionKernelAccount([sudoPolicy])
        })
    })

    test("Account address should be a valid Ethereum address", async () => {
        const account = permissionSmartAccountClient.account
        console.log("Account address:", account.address)
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(account.address).not.toEqual(zeroAddress)
    })

    test(
        "Should install PermissionValidator as initConfig",
        async () => {
            const publicClient = await getPublicClient()
            const signer = privateKeyToAccount(generatePrivateKey())
            const ecdsaValidatorPlugin = await signerToEcdsaValidator(
                publicClient,
                {
                    entryPoint: getEntryPoint(),
                    signer,
                    kernelVersion: defaultKernelVersion
                }
            )
            const sessionKeySigner = privateKeyToAccount(generatePrivateKey())
            const ecdsaModularSigner = await toECDSASigner({
                signer: sessionKeySigner
            })

            const permissionPlugin = await toPermissionValidator(publicClient, {
                entryPoint: getEntryPoint(),
                signer: ecdsaModularSigner,
                kernelVersion: defaultKernelVersion,
                policies: [toSudoPolicy({})]
            })

            const account = await createKernelAccount(publicClient, {
                entryPoint: getEntryPoint(),
                plugins: {
                    sudo: ecdsaValidatorPlugin
                },
                kernelVersion: defaultKernelVersion,
                initConfig: await toInitConfig(permissionPlugin)
            })
            const kernelClient = await getKernelAccountClient({
                account
            })
            const tx = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            await publicClient.waitForTransactionReceipt({ hash: tx })

            const permissionAccount = await createKernelAccount(publicClient, {
                entryPoint: getEntryPoint(),
                plugins: {
                    regular: permissionPlugin
                },
                kernelVersion: defaultKernelVersion,
                address: account.address
            })

            const permissionKernelClient = await getKernelAccountClient({
                account: permissionAccount
            })

            const tx2 = await permissionKernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            await publicClient.waitForTransactionReceipt({ hash: tx2 })
        },
        TEST_TIMEOUT
    )
})
