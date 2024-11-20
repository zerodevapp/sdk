// @ts-expect-error
import { describe, test } from "bun:test"
import { createKernelAccount, createZeroDevPaymasterClient } from "@zerodev/sdk"
import { KERNEL_V3_1 } from "@zerodev/sdk/constants"
import { http, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import {
    type WeightedSigner,
    createWeightedKernelAccountClient,
    createWeightedValidator,
    toECDSASigner
} from "../../../plugins/weighted-r1-k1"
import {
    getBundlerRpc,
    getEntryPoint,
    getPaymasterRpc,
    getPublicClient
} from "./utils"

const TEST_TIMEOUT = 1000000

describe("weightedValidator", () => {
    test(
        "should enable regular validator",
        async () => {
            const publicClient = await getPublicClient()
            const entryPoint = getEntryPoint()
            const chain = sepolia
            const paymasterUrl = getPaymasterRpc()
            const bundlerUrl = getBundlerRpc()

            const pKey1 =
                "0x2827b876ee775816460ab6eb4481352a752101f950899831702ccead54000001"
            const pKey2 =
                "0x2827b876ee775816460ab6eb4481352a752101f950899831702ccead54000002"

            const eoaAccount1 = privateKeyToAccount(pKey1)
            const eoaAccount2 = privateKeyToAccount(pKey2)

            const ecdsaSigner1 = await toECDSASigner({ signer: eoaAccount1 })
            const ecdsaSigner2 = await toECDSASigner({ signer: eoaAccount2 })

            const createWeightedAccountClient = async (
                signer: WeightedSigner
            ) => {
                const multiSigValidator = await createWeightedValidator(
                    publicClient,
                    {
                        entryPoint,
                        signer,
                        config: {
                            threshold: 100,
                            signers: [
                                {
                                    publicKey: ecdsaSigner1.account.address,
                                    weight: 50
                                },
                                {
                                    publicKey: ecdsaSigner2.account.address,
                                    weight: 50
                                }
                            ]
                        },
                        kernelVersion: KERNEL_V3_1
                    }
                )

                const account = await createKernelAccount(publicClient, {
                    entryPoint,
                    plugins: {
                        sudo: multiSigValidator
                    },
                    kernelVersion: KERNEL_V3_1
                })

                console.log(`Account address: ${account.address}`)

                const paymasterClient = createZeroDevPaymasterClient({
                    chain,
                    transport: http(paymasterUrl)
                })

                const client = createWeightedKernelAccountClient({
                    account,
                    chain,
                    bundlerTransport: http(bundlerUrl),
                    paymaster: paymasterClient
                })
                return client
            }

            const client1 = await createWeightedAccountClient(ecdsaSigner1)
            const client2 = await createWeightedAccountClient(ecdsaSigner2)

            const signature1 = await client1.approveUserOperation({
                callData: await client1.account.encodeCalls([
                    {
                        to: zeroAddress,
                        data: "0x",
                        value: BigInt(0)
                    }
                ])
            })

            const signature2 = await client2.approveUserOperation({
                calls: [
                    {
                        to: zeroAddress,
                        data: "0x",
                        value: BigInt(0)
                    }
                ]
            })

            const userOpHash = await client2.sendUserOperationWithSignatures({
                callData: await client1.account.encodeCalls([
                    {
                        to: zeroAddress,
                        data: "0x",
                        value: BigInt(0)
                    }
                ]),
                signatures: [signature1, signature2]
            })

            console.log({ userOpHash })

            const rcpt = await client2.waitForUserOperationReceipt({
                hash: userOpHash
            })
            console.log({ txHash: rcpt.receipt.transactionHash })
        },
        TEST_TIMEOUT
    )
})
