import { beforeAll, describe, expect, test } from "bun:test"
import {
    KernelAccountClient,
    KernelSmartAccount,
    KernelV3AccountAbi
} from "@zerodev/sdk"
import { BundlerClient } from "permissionless"
import { EntryPoint } from "permissionless/types/entrypoint"
import {
    Chain,
    PublicClient,
    Transport,
    decodeAbiParameters,
    decodeErrorResult,
    decodeFunctionData,
    zeroAddress
} from "viem"
import {
    getEntryPoint,
    getKernelAccountClient,
    getKernelBundlerClient,
    getPublicClient,
    getSignerToPermissionKernelAccount,
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
        account = await getSignerToPermissionKernelAccount()
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
        const data = decodeAbiParameters(
            [
                { name: "maxGasAllowedInWei", type: "uint128" },
                { name: "enforcePaymaster", type: "bool" },
                { name: "paymasterAddress", type: "address" },
                { name: "permissionId", type: "bytes32" }
            ],
            "0x0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a8eb000000000000000000000000000000000000000000000000000000000000"
        )
        const data1 = decodeFunctionData({
            abi: [
                {
                    type: "function",
                    name: "checkUserOpPolicy",
                    inputs: [
                        {
                            name: "id",
                            type: "bytes32",
                            internalType: "bytes32"
                        },
                        {
                            name: "userOp",
                            type: "tuple",
                            internalType: "struct PackedUserOperation",
                            components: [
                                {
                                    name: "sender",
                                    type: "address",
                                    internalType: "address"
                                },
                                {
                                    name: "nonce",
                                    type: "uint256",
                                    internalType: "uint256"
                                },
                                {
                                    name: "initCode",
                                    type: "bytes",
                                    internalType: "bytes"
                                },
                                {
                                    name: "callData",
                                    type: "bytes",
                                    internalType: "bytes"
                                },
                                {
                                    name: "accountGasLimits",
                                    type: "bytes32",
                                    internalType: "bytes32"
                                },
                                {
                                    name: "preVerificationGas",
                                    type: "uint256",
                                    internalType: "uint256"
                                },
                                {
                                    name: "gasFees",
                                    type: "bytes32",
                                    internalType: "bytes32"
                                },
                                {
                                    name: "paymasterAndData",
                                    type: "bytes",
                                    internalType: "bytes"
                                },
                                {
                                    name: "signature",
                                    type: "bytes",
                                    internalType: "bytes"
                                }
                            ]
                        }
                    ],
                    outputs: [
                        { name: "", type: "uint256", internalType: "uint256" }
                    ],
                    stateMutability: "payable"
                }
            ],
            data: "0x7129edced37d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000e71ce7d0d49b9aaee742960fdad27c5506eea20d0002d37d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000014000000000000000000030786231373035000000000000000030783133366662350000000000000000000000000000000000000000000000000000000000014adc000000000000307833623961636130300000000000003078336239616430396600000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e4e9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
        })
        const data2 = decodeErrorResult({
            abi: KernelV3AccountAbi,
            data: "0x8baa579f"
        })
        const data3 = decodeFunctionData({
            abi: [
                {
                    type: "function",
                    name: "onInstall",
                    inputs: [
                        { name: "data", type: "bytes", internalType: "bytes" }
                    ],
                    outputs: [],
                    stateMutability: "payable"
                }
            ],
            data: "0x6d61fe70000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a0bb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb48000000000000000000000000000000000000000000000000000000000000"
        })
        const data4 = decodeAbiParameters(
            [
                { name: "maxGasAllowedInWei", type: "uint128" },
                { name: "enforcePaymaster", type: "bool" },
                { name: "paymasterAddress", type: "address" },
                { name: "permissionId", type: "bytes32" }
            ],
            // "0xbb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb48000000000000000000000000000000000000000000000000000000000000"
            "0x0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb48000000000000000000000000000000000000000000000000000000000000"
        )
        const data5 = decodeAbiParameters(
            [{ name: "data", type: "bytes[]" }],
            "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000960000008A6F0e6C23C54a897Ead27a7B957183f8E3c960000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb4800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004a000008bC98f4B3A5222497a5eBC9357ea1a56f9933dcA02CDdFa44B8C01b4257F54ac1c43F75801E8175bb4800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
        )

        const data6 = decodeFunctionData({
            abi: [
                {
                    inputs: [
                        {
                            internalType: "bytes32",
                            name: "id",
                            type: "bytes32"
                        },
                        {
                            internalType: "struct PackedUserOperation",
                            name: "userOp",
                            type: "tuple",
                            components: [
                                {
                                    internalType: "address",
                                    name: "sender",
                                    type: "address"
                                },
                                {
                                    internalType: "uint256",
                                    name: "nonce",
                                    type: "uint256"
                                },
                                {
                                    internalType: "bytes",
                                    name: "initCode",
                                    type: "bytes"
                                },
                                {
                                    internalType: "bytes",
                                    name: "callData",
                                    type: "bytes"
                                },
                                {
                                    internalType: "bytes32",
                                    name: "accountGasLimits",
                                    type: "bytes32"
                                },
                                {
                                    internalType: "uint256",
                                    name: "preVerificationGas",
                                    type: "uint256"
                                },
                                {
                                    internalType: "bytes32",
                                    name: "gasFees",
                                    type: "bytes32"
                                },
                                {
                                    internalType: "bytes",
                                    name: "paymasterAndData",
                                    type: "bytes"
                                },
                                {
                                    internalType: "bytes",
                                    name: "signature",
                                    type: "bytes"
                                }
                            ]
                        },
                        {
                            internalType: "bytes32",
                            name: "userOpHash",
                            type: "bytes32"
                        }
                    ],
                    stateMutability: "payable",
                    type: "function",
                    name: "checkUserOpSignature",
                    outputs: [
                        { internalType: "uint256", name: "", type: "uint256" }
                    ]
                }
            ],
            data: "0x0ccab7a161dd0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060e23162655bd883657cf770c187327fc366c2f3f058d9eafafc7bbf6641242366000000000000000000000000e71ce7d0d49b9aaee742960fdad27c5506eea20d000261dd000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000014000000000000000000030786231373035000000000000000030783133366662350000000000000000000000000000000000000000000000000000000000014adc000000000000307833623961636130300000000000003078336239616361313800000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e4e9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040fffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
        })
        // console.log("data1", data1)
        // console.log("data3", data3)
        // console.log("data4", data4)
        // console.log("data5", data5)
        console.log("data6", data6)
        console.log("Account address:", account.address)
        expect(account.address).toBeString()
        expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH)
        expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX)
        expect(account.address).not.toEqual(zeroAddress)
    })

    test(
        "Smart account client send transaction",
        async () => {
            // const response = await kernelClient.sendUserOperation({
            //     userOperation: {
            //         callData: await kernelClient.account.encodeCallData({
            //             to: zeroAddress,
            //             value: 0n,
            //             data: "0x"
            //         }),
            //         preVerificationGas: 84700n,
            //         callGasLimit: 1273781n,
            //         verificationGasLimit: 726789n
            //     }
            // })
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
