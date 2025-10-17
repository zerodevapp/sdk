import { beforeAll, describe, expect, test } from "bun:test"
import { verifyMessage } from "@ambire/signature-validator"
import { getKernelAddressFromECDSA } from "@zerodev/ecdsa-validator"
import {
    constants,
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    verifyEIP6492Signature
} from "@zerodev/sdk"
import dotenv from "dotenv"
import { ethers } from "ethers"
import {
    type Address,
    type GetContractReturnType,
    type Hex,
    type PublicClient,
    hashMessage,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { type PrivateKeyAccount, privateKeyToAccount } from "viem/accounts"
import type { GreeterAbi } from "../abis/Greeter.js"
import { config } from "../config.js"
import { validateEnvironmentVariables } from "../v0.7/utils/common.js"
import {
    defaultChainId,
    defaultIndex,
    getEntryPoint,
    getPublicClient,
    getZeroDevPaymasterClient
} from "./utils/common.js"
import {
    getEcdsaKernelAccountWithRandomSigner,
    getKernelAccountClient,
    getSignerToEcdsaKernelAccount
} from "./utils/ecdsaUtils.js"

dotenv.config()

const requiredEnvVars = [
    "FACTORY_ADDRESS",
    "TEST_PRIVATE_KEY",
    "RPC_URL",
    "ENTRYPOINT_ADDRESS",
    "GREETER_ADDRESS",
    "ZERODEV_V3_PROJECT_ID"
]

validateEnvironmentVariables(requiredEnvVars)

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("ECDSA kernel Account v0.8", () => {
    let account: SmartAccount<KernelSmartAccountImplementation<"0.8">>
    let ownerAccount: PrivateKeyAccount
    let publicClient: PublicClient
    let kernelClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation<"0.8">>
    >
    let greeterContract: GetContractReturnType<
        typeof GreeterAbi,
        typeof kernelClient,
        Address
    >
    let owner: Address

    beforeAll(async () => {
        const ownerPrivateKey = process.env.TEST_PRIVATE_KEY as Hex
        ownerAccount = privateKeyToAccount(ownerPrivateKey)
        account = await getSignerToEcdsaKernelAccount()
        owner = privateKeyToAccount(ownerPrivateKey).address
        publicClient = await getPublicClient()
        kernelClient = await getKernelAccountClient({
            account
        })
    })

    test("account address should be a valid Ethereum address", async () => {
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(account.address).not.toEqual(zeroAddress)
    })

    test("getKernelAddressFromECDSA util should return valid account address", async () => {
        const kernelVersion = account.kernelVersion

        const generatedAccountAddress = await getKernelAddressFromECDSA({
            entryPoint: getEntryPoint(),
            kernelVersion,
            eoaAddress: ownerAccount.address,
            index: defaultIndex,
            initCodeHash:
                constants.KernelVersionToAddressesMap[kernelVersion]
                    .initCodeHash ?? "0x"
        })
        expect(account.address).toEqual(generatedAccountAddress)
    })

    test(
        "should validate message signatures for undeployed accounts (6492)",
        async () => {
            const account = await getEcdsaKernelAccountWithRandomSigner()
            const chainId = account.client.chain?.id ?? defaultChainId
            const message = "hello world"
            const signature = await account.signMessage({
                message
            })

            expect(
                await verifyEIP6492Signature({
                    signer: account.address,
                    hash: hashMessage(message),
                    signature: signature,
                    client: publicClient
                })
            ).toBeTrue()

            const ambireResult = await verifyMessage({
                signer: account.address,
                message,
                signature: signature,
                provider: new ethers.providers.JsonRpcProvider(
                    config["0.8"][chainId].rpcUrl
                )
            })
            expect(ambireResult).toBeTrue()
        },
        TEST_TIMEOUT
    )
})
