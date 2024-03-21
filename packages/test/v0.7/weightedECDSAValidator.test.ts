import { beforeAll, describe, expect, test } from "bun:test"
import { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk"
import { BundlerClient } from "permissionless"
import { EntryPoint } from "permissionless/types/entrypoint"
import { Chain, PublicClient, Transport, zeroAddress } from "viem"
import {
    getEntryPoint,
    getKernelAccountClient,
    getKernelBundlerClient,
    getPublicClient,
    getSignersToWeightedEcdsaKernelAccount,
    getZeroDevPaymasterClient
} from "./utils"

const ETHEREUM_ADDRESS_LENGTH = 42
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE_LENGTH = 174
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/
const TX_HASH_LENGTH = 66
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/
const TEST_TIMEOUT = 1000000

describe("Weighted ECDSA kernel Account", () => {
    let account: KernelSmartAccount<EntryPoint>
    let publicClient: PublicClient
    let bundlerClient: BundlerClient<EntryPoint>
    let kernelClient: KernelAccountClient<
        EntryPoint,
        Transport,
        Chain,
        KernelSmartAccount<EntryPoint>
    >

    beforeAll(async () => {
        account = await getSignersToWeightedEcdsaKernelAccount()
        publicClient = await getPublicClient()
        bundlerClient = getKernelBundlerClient()
        kernelClient = await getKernelAccountClient({
            account,
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
