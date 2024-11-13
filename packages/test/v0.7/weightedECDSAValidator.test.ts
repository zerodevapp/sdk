// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import type {
    KernelAccountClient,
    KernelSmartAccountImplementation,
    ZeroDevPaymasterClient
} from "@zerodev/sdk"
import {
    type Chain,
    type PublicClient,
    type Transport,
    zeroAddress
} from "viem"
import {
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getSignersToWeightedEcdsaKernelAccount,
    getZeroDevPaymasterClient
} from "./utils"
import type { SmartAccount } from "viem/account-abstraction"

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("Weighted ECDSA kernel Account", () => {
    let account: SmartAccount<KernelSmartAccountImplementation>
    let publicClient: PublicClient
    let kernelClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >
    let zeroDevPaymaster: ZeroDevPaymasterClient

    beforeAll(async () => {
        account = await getSignersToWeightedEcdsaKernelAccount()
        publicClient = await getPublicClient()
        zeroDevPaymaster = getZeroDevPaymasterClient()
        kernelClient = await getKernelAccountClient({
            account,
            paymaster: zeroDevPaymaster
        })
    })

    test("Account address should be a valid Ethereum address", async () => {
        console.log("Account address:", account.address)
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(account.address).not.toEqual(zeroAddress)
    })

    test(
        "Smart account client send transaction",
        async () => {
            const response = await kernelClient.sendTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
            expect(response).toBeString()
            expect(response).toHaveLength(TX_HASH_LENGTH)
            expect(response).toMatch(TX_HASH_REGEX)
            console.log("Transaction hash:", response)
        },
        TEST_TIMEOUT
    )
})
