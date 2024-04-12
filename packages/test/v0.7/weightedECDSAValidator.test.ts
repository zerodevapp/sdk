// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk"
import {
    combineSignatures,
    signWithSingleSigner
} from "@zerodev/weighted-ecdsa-validator"
import { BundlerClient } from "permissionless"
import { prepareUserOperationRequest } from "permissionless/actions/smartAccount"
import { PimlicoBundlerClient } from "permissionless/clients/pimlico"
import { EntryPoint } from "permissionless/types/entrypoint"
import { Chain, Hex, PublicClient, Transport, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import {
    getEntryPoint,
    getKernelAccountClient,
    getKernelBundlerClient,
    getPimlicoBundlerClient,
    getPublicClient,
    getSignersToWeightedEcdsaKernelAccount,
    getZeroDevPaymasterClient,
    sortByAddress
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
    let pimlicoBundlerClient: PimlicoBundlerClient<EntryPoint>

    beforeAll(async () => {
        account = await getSignersToWeightedEcdsaKernelAccount()
        publicClient = await getPublicClient()
        bundlerClient = getKernelBundlerClient()
        pimlicoBundlerClient = getPimlicoBundlerClient()
        kernelClient = await getKernelAccountClient({
            account,
            middleware: {
                gasPrice: async () =>
                    (await pimlicoBundlerClient.getUserOperationGasPrice())
                        .fast,
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

    // test("Account address should be a valid Ethereum address", async () => {
    //     console.log("Account address:", account.address)
    //     expect(account.address).toBeString()
    //     expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
    //     expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
    //     expect(account.address).not.toEqual(zeroAddress)
    // })

    // test(
    //     "Smart account client send transaction",
    //     async () => {
    //         const response = await kernelClient.sendTransaction({
    //             to: zeroAddress,
    //             value: 0n,
    //             data: "0x"
    //         })
    //         expect(response).toBeString()
    //         expect(response).toHaveLength(TX_HASH_LENGTH)
    //         expect(response).toMatch(TX_HASH_REGEX)
    //         console.log("Transaction hash:", response)
    //     },
    //     TEST_TIMEOUT
    // )

    test(
        "Smart account client send transaction with combined signatures",
        async () => {
            const privateKey1 = process.env.TEST_PRIVATE_KEY as Hex
            const privateKey2 = process.env.TEST_PRIVATE_KEY2 as Hex
            if (!privateKey1 || !privateKey2) {
                throw new Error(
                    "TEST_PRIVATE_KEY and TEST_PRIVATE_KEY2 environment variables must be set"
                )
            }

            const signer1 = privateKeyToAccount(privateKey1)
            const signer2 = privateKeyToAccount(privateKey2)

            const userOperation =
                await kernelClient.prepareUserOperationRequest({
                    userOperation: {
                        callData: await account.encodeCallData({
                            to: zeroAddress,
                            value: BigInt(0),
                            data: "0x"
                        })
                    }
                })

            const sortedSigner = [signer1, signer2].sort(sortByAddress)

            const signature1 = await signWithSingleSigner(publicClient, {
                signer: signer1,
                totalSignerAddresses: sortedSigner.map(
                    (signer) => signer.address
                ),
                userOperation,
                entryPoint: getEntryPoint()
            })

            const signature2 = await signWithSingleSigner(publicClient, {
                signer: signer2,
                totalSignerAddresses: sortedSigner.map(
                    (signer) => signer.address
                ),
                userOperation,
                entryPoint: getEntryPoint()
            })

            const combinedSignature = combineSignatures([
                { signerAddress: signer1.address, signature: signature1 },
                { signerAddress: signer2.address, signature: signature2 }
            ])

            const userOpHash = await kernelClient.sendUserOperation({
                userOperation: {
                    ...userOperation,
                    signature: combinedSignature
                }
            })
            expect(userOpHash).toHaveLength(66)
            console.log("User operation hash:", userOpHash)
        },
        TEST_TIMEOUT
    )
})
