// @ts-expect-error
import { beforeAll, describe, test } from "bun:test"
import { createKernelCABClient } from "@zerodev/cab"
import {
    type KernelAccountClient,
    type KernelSmartAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import {
    CAB_PAYMASTER_SERVER_URL,
    getInstallDMAsExecutorCallData
} from "@zerodev/session-account"
import {
    ParamCondition,
    toAllowedParamsEnforcer
} from "@zerodev/session-account/enforcers"
import { type BundlerClient, bundlerActions } from "permissionless"
import type { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types/entrypoint"
import {
    http,
    type Address,
    type Chain,
    type PublicClient,
    type Transport,
    createPublicClient,
    decodeErrorResult,
    encodeFunctionData,
    parseEther,
    zeroAddress
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { baseSepolia, optimismSepolia } from "viem/chains"
import type {
    Caveat,
    SessionAccount
} from "../../../plugins/multi-tenant-session-account"
import { dmActionsEip7710 } from "../../../plugins/multi-tenant-session-account/clients"
import { ROOT_AUTHORITY } from "../../../plugins/multi-tenant-session-account/constants"
import { toCABPaymasterEnforcer } from "../../../plugins/multi-tenant-session-account/enforcers/cab-paymaster/toCABPaymasterEnforcer"
import type { Delegation } from "../../../plugins/multi-tenant-session-account/types"
import type { YiSubAccount } from "../../../plugins/yiSubAccount"
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi"
import { config } from "../config"
import { Test_ERC20Address } from "../utils"
import {
    getBundlerRpc,
    getEcdsaKernelAccountWithRandomSigner,
    getEntryPoint,
    getKernelAccountClient,
    getPaymasterRpc,
    getPublicClient,
    getSessionAccount,
    getZeroDevPaymasterClient,
    mintToAccount
} from "./utils"

const TEST_TIMEOUT = 1000000

describe("Yi SubAccount", () => {
    let publicClient: PublicClient
    let mainDelegatorAccount: KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    let account: YiSubAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    let bundlerClient: BundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE>
    let kernelClient: KernelAccountClient<
        ENTRYPOINT_ADDRESS_V07_TYPE,
        Transport,
        Chain,
        KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    >
    let sessionAccount: SessionAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    let sessionAccountClient: KernelAccountClient<
        ENTRYPOINT_ADDRESS_V07_TYPE,
        Transport,
        Chain,
        KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    >
    let delegations: Delegation[]

    beforeAll(async () => {
        const ownerPrivateKey = process.env.TEST_PRIVATE_KEY
        if (!ownerPrivateKey) {
            throw new Error("TEST_PRIVATE_KEY is not set")
        }
        publicClient = await getPublicClient()
        mainDelegatorAccount = await getEcdsaKernelAccountWithRandomSigner()
        kernelClient = await getKernelAccountClient({
            account: mainDelegatorAccount,
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

        // const installTx = await kernelClient.sendTransaction({
        //     to: kernelClient.account.address,
        //     value: 0n,
        //     data: getInstallDMAsExecutorCallData()
        // })
        // console.log({ installTx })

        bundlerClient = kernelClient.extend(bundlerActions(getEntryPoint()))
    })

    test(
        "Send a sudo tx without caveat from kernelAccount through sessionAccount",
        async () => {
            const caveats = []
            const privateSessionKey = generatePrivateKey()
            const sessionKeyAccount = privateKeyToAccount(privateSessionKey)
            delegations = [
                {
                    delegator: mainDelegatorAccount.address,
                    delegate: sessionKeyAccount.address,
                    authority: ROOT_AUTHORITY,
                    caveats,
                    salt: 0n,
                    signature: "0x"
                }
            ]

            const kernelClientDM = kernelClient.extend(
                dmActionsEip7710<
                    ENTRYPOINT_ADDRESS_V07_TYPE,
                    KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
                >()
            )

            const mainDeleGatorSignature = await kernelClientDM.signDelegation({
                delegation: delegations[0]
            })
            console.log({ mainDeleGatorSignature })
            delegations[0].signature = mainDeleGatorSignature
            const initCode = await mainDelegatorAccount.getInitCode()
            sessionAccount = await getSessionAccount(
                delegations,
                privateSessionKey,
                initCode
            )
            sessionAccountClient = await getKernelAccountClient({
                // @ts-ignore: fix return type error
                account: sessionAccount,
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
            const userOpHash = await sessionAccountClient.sendUserOperation({
                userOperation: {
                    callData: await sessionAccount.encodeCallData({
                        to: zeroAddress,
                        data: "0x",
                        value: 0n
                    }),
                    preVerificationGas: 84700n,
                    callGasLimit: 1273781n,
                    verificationGasLimit: 726789n
                }
            })
            const receipt = await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
            console.log(
                "transactionHash",
                `https://sepolia.etherscan.io/tx/${receipt.receipt.transactionHash}`
            )
        },
        TEST_TIMEOUT
    )

    test(
        "Send tx with allowedParams caveats from kernelAccount through sessionAccount",
        async () => {
            const privateSessionKey = generatePrivateKey()
            const sessionKeyAccount = privateKeyToAccount(privateSessionKey)
            const allowedParamsCaveat = toAllowedParamsEnforcer({
                permissions: [
                    {
                        abi: TEST_ERC20Abi,
                        target: Test_ERC20Address,
                        functionName: "transfer",
                        args: [
                            {
                                condition: ParamCondition.EQUAL,
                                value: sessionKeyAccount.address
                            },
                            null
                        ]
                    }
                ]
            })
            const caveats = [allowedParamsCaveat]

            delegations = [
                {
                    delegator: mainDelegatorAccount.address,
                    delegate: sessionKeyAccount.address,
                    authority: ROOT_AUTHORITY,
                    caveats,
                    salt: 0n,
                    signature: "0x"
                }
            ]

            const kernelClientDM = kernelClient.extend(
                dmActionsEip7710<
                    ENTRYPOINT_ADDRESS_V07_TYPE,
                    KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
                >()
            )

            const mainDeleGatorSignature = await kernelClientDM.signDelegation({
                delegation: delegations[0]
            })
            console.log({ mainDeleGatorSignature })
            delegations[0].signature = mainDeleGatorSignature
            const initCode = await mainDelegatorAccount.getInitCode()
            sessionAccount = await getSessionAccount(
                delegations,
                privateSessionKey,
                initCode
            )
            sessionAccountClient = await getKernelAccountClient({
                // @ts-ignore: fix return type error
                account: sessionAccount,
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

            await mintToAccount(
                kernelClient.account.client as PublicClient,
                kernelClient,
                kernelClient.account.address,
                100000000n
            )

            const amountToTransfer = 10000n
            const transferData = encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [sessionKeyAccount.address, amountToTransfer]
            })
            const userOpHash = await sessionAccountClient.sendUserOperation({
                userOperation: {
                    callData: await sessionAccount.encodeCallData({
                        to: Test_ERC20Address,
                        data: transferData,
                        value: 0n
                    }),
                    preVerificationGas: 84700n,
                    callGasLimit: 1273781n,
                    verificationGasLimit: 726789n
                }
            })
            const receipt = await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
            console.log(
                "transactionHash",
                `https://sepolia.etherscan.io/tx/${receipt.receipt.transactionHash}`
            )
        },
        TEST_TIMEOUT
    )

    test(
        "enable cab",
        async () => {
            const kernelCabClient = createKernelCABClient(kernelClient, {
                transport: http(CAB_PAYMASTER_SERVER_URL)
            })
            console.log("kernelCabClient addr", kernelCabClient.account.address)
            await kernelCabClient.enableCAB({
                tokens: [{ name: "6TEST", networks: [baseSepolia.id] }]
            })
            await mintToAccount(
                kernelClient.account.client as PublicClient,
                kernelClient,
                "0x066aB66D299600E006abD1af0d41AC872b77aeb6",
                parseEther("0.99999999999")
            )
            await mintToAccount(
                kernelClient.account.client as PublicClient,
                kernelClient,
                "0x066aB66D299600E006abD1af0d41AC872b77aeb6",
                parseEther("0.99999999999")
            )

            const mainDelegatorAccountOPSepolia =
                await getEcdsaKernelAccountWithRandomSigner(
                    undefined,
                    "OP Sepolia"
                )

            const kernelClientOPSepolia = createKernelAccountClient({
                account: mainDelegatorAccountOPSepolia,
                chain: optimismSepolia,
                bundlerTransport: http(
                    getBundlerRpc(config["v0.7"]["OP Sepolia"].projectId),
                    { timeout: 100_000 }
                ),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        const zeroDevPaymaster = createZeroDevPaymasterClient({
                            chain: optimismSepolia,
                            transport: http(
                                getPaymasterRpc(
                                    config["v0.7"]["OP Sepolia"].projectId
                                )
                            ),
                            entryPoint: getEntryPoint()
                        })
                        return zeroDevPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint: getEntryPoint()
                        })
                    }
                },
                entryPoint: getEntryPoint()
            })

            await mintToAccount(
                kernelClientOPSepolia.account.client as PublicClient,
                kernelClientOPSepolia,
                kernelClientOPSepolia.account.address,
                100000000n
            )

            const kernelCabClientOPSepolia = createKernelCABClient(
                kernelClientOPSepolia,
                {
                    transport: http(CAB_PAYMASTER_SERVER_URL)
                }
            )
            console.log(
                "kernelCabClientOPSepolia addr",
                kernelCabClientOPSepolia.account.address
            )
            await kernelCabClientOPSepolia.enableCAB({
                tokens: [{ name: "6TEST", networks: [optimismSepolia.id] }]
            })
            while (true) {
                const repayTokens = [
                    {
                        address:
                            "0x3870419ba2bbf0127060bcb37f69a1b1c090992b" as Address,
                        chainId: optimismSepolia.id
                    }
                ]
                const cabClient = createPublicClient({
                    transport: http(CAB_PAYMASTER_SERVER_URL)
                })

                const cabBalance = await cabClient.request({
                    // @ts-ignore
                    method: "pm_getCabAvailableRepayTokens",
                    params: [kernelCabClientOPSepolia.account.address]
                    // token: "0x3870419ba2bbf0127060bcb37f69a1b1c090992b"
                    // repayTokens
                })
                console.log("CAB balance:", cabBalance)
                if (cabBalance) {
                    break
                }
            }
        },
        TEST_TIMEOUT
    )
    test(
        "Send tx with cab caveat from kernelAccount through sessionAccount",
        async () => {
            const privateSessionKey = generatePrivateKey()
            const sessionKeyAccount = privateKeyToAccount(privateSessionKey)
            const allowedParamsCaveat = toAllowedParamsEnforcer({
                permissions: [
                    {
                        abi: TEST_ERC20Abi,
                        target: Test_ERC20Address,
                        functionName: "transfer",
                        args: [
                            {
                                condition: ParamCondition.EQUAL,
                                value: sessionKeyAccount.address
                            },
                            null
                        ]
                    }
                ]
            })
            const cabCaveat = toCABPaymasterEnforcer({})
            const caveats = [cabCaveat]

            delegations = [
                {
                    delegator: mainDelegatorAccount.address,
                    delegate: sessionKeyAccount.address,
                    authority: ROOT_AUTHORITY,
                    caveats,
                    salt: 0n,
                    signature: "0x"
                }
            ]

            const kernelClientDM = kernelClient.extend(
                dmActionsEip7710<
                    ENTRYPOINT_ADDRESS_V07_TYPE,
                    KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
                >()
            )

            const mainDeleGatorSignature = await kernelClientDM.signDelegation({
                delegation: delegations[0]
            })
            console.log({ mainDeleGatorSignature })
            delegations[0].signature = mainDeleGatorSignature
            const initCode = await mainDelegatorAccount.getInitCode()
            sessionAccount = await getSessionAccount(
                delegations,
                privateSessionKey,
                initCode
            )
            sessionAccountClient = await getKernelAccountClient({
                // @ts-ignore: fix return type error
                account: sessionAccount,
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

            // await mintToAccount(
            //     kernelClient.account.client as PublicClient,
            //     kernelClient,
            //     kernelClient.account.address,
            //     100000000n
            // )

            const amountToTransfer = 10000n
            const transferData = encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [sessionKeyAccount.address, amountToTransfer]
            })
            const sessionAccountClientDM = sessionAccountClient.extend(
                dmActionsEip7710<
                    ENTRYPOINT_ADDRESS_V07_TYPE,
                    KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
                >()
            )
            const repayTokens = [
                {
                    address:
                        "0x3870419ba2bbf0127060bcb37f69a1b1c090992b" as Address,
                    chainId: optimismSepolia.id
                }
            ]
            // const txHash = await sessionAccountClientDM.sendTransactionWithCAB({
            //     to: Test_ERC20Address,
            //     data: transferData,
            //     value: 0n,
            //     repayTokens
            // })
            const userOpHash = await sessionAccountClient.sendUserOperation({
                userOperation: {
                    callData:
                        await sessionAccountClientDM.encodeCallDataWithCAB({
                            calls: [
                                {
                                    to: Test_ERC20Address,
                                    data: transferData,
                                    value: 0n
                                }
                            ],
                            repayTokens
                        })
                }
            })

            const receipt = await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash
            })

            console.log(
                "transactionHash",
                `https://sepolia.etherscan.io/tx/${receipt.receipt.transactionHash}`
            )
        },
        TEST_TIMEOUT
    )
})
