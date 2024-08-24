// @ts-expect-error
import { beforeAll, describe, expect, test } from "bun:test"
import { createKernelAccount, createZeroDevPaymasterClient } from "@zerodev/sdk"
import { KERNEL_V3_1 } from "@zerodev/sdk/constants"
import { http, zeroAddress } from "viem"
import { Address, privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import {
    CallPolicyVersion,
    toCallPolicy
} from "../../../plugins/permission/policies"
import { toECDSASigner as toStandaloneECDSASigner } from "../../../plugins/permission/signers"
import { toPermissionValidator } from "../../../plugins/permission/toPermissionValidator"
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
        "should work",
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

                const callPolicy = toCallPolicy({
                    policyVersion: CallPolicyVersion.V0_0_4,
                    permissions: [
                        {
                            target: zeroAddress,
                            valueLimit: BigInt(0)
                        }
                    ]
                })
                const pKey =
                    "0xd565cc0ff5dc317e52fb4e9be3c2d5cfd86734a98ffbb97f103e3bac009b30d9"
                const someSigner = toStandaloneECDSASigner({
                    signer: privateKeyToAccount(pKey)
                })
                const kernelVersion = KERNEL_V3_1
                const permissionValidator = await toPermissionValidator(
                    publicClient,
                    {
                        entryPoint,
                        kernelVersion,
                        signer: someSigner,
                        policies: [callPolicy]
                    }
                )

                const account = await createKernelAccount(publicClient, {
                    entryPoint,
                    plugins: {
                        sudo: multiSigValidator,
                        regular: permissionValidator
                    },
                    kernelVersion: KERNEL_V3_1
                })

                console.log(`Account address: ${account.address}`)

                const paymasterClient = createZeroDevPaymasterClient({
                    entryPoint,
                    chain,
                    transport: http(paymasterUrl)
                })

                const client = createWeightedKernelAccountClient({
                    account,
                    entryPoint,
                    chain,
                    bundlerTransport: http(bundlerUrl),
                    middleware: {
                        sponsorUserOperation:
                            paymasterClient.sponsorUserOperation
                    }
                })
                return client
            }

            const client1 = await createWeightedAccountClient(ecdsaSigner1)
            const client2 = await createWeightedAccountClient(ecdsaSigner2)

            const signature1 = await client1.approveUserOperation({
                userOperation: {
                    callData: await client1.account.encodeCallData({
                        to: zeroAddress,
                        data: "0x",
                        value: BigInt(0)
                    })
                }
            })

            const signature2 = await client2.approveUserOperation({
                userOperation: {
                    callData: await client2.account.encodeCallData({
                        to: zeroAddress,
                        data: "0x",
                        value: BigInt(0)
                    })
                }
            })

            const userOpHash = await client2.sendUserOperationWithSignatures({
                userOperation: {
                    callData: await client1.account.encodeCallData({
                        to: zeroAddress,
                        data: "0x",
                        value: BigInt(0)
                    })
                },
                signatures: []
            })

            console.log({ userOpHash })
        },
        TEST_TIMEOUT
    )
})
