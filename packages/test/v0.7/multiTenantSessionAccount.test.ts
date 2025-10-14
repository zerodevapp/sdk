// @ts-expect-error
import { beforeAll, describe, test } from "bun:test"
import {
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    type ZeroDevPaymasterClient,
    createKernelAccountClient,
    type createZeroDevPaymasterClient
} from "@zerodev/sdk"
import {
    CAB_PAYMASTER_SERVER_URL,
    getInstallDMAsExecutorCallData
} from "@zerodev/session-account"
import type { SessionAccountImplementation } from "@zerodev/session-account"
import {
    type ENFORCER_VERSION,
    ParamCondition,
    toAllowedParamsEnforcer
} from "@zerodev/session-account/enforcers"
import {
    http,
    type Address,
    type Chain,
    type PublicClient,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    parseEther,
    zeroAddress
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { optimismSepolia, sepolia } from "viem/chains"
import { dmActionsEip7710 } from "../../../plugins/multi-tenant-session-account/clients"
import { ROOT_AUTHORITY } from "../../../plugins/multi-tenant-session-account/constants"
import { toCABPaymasterEnforcer } from "../../../plugins/multi-tenant-session-account/enforcers/cab-paymaster/toCABPaymasterEnforcer"
import type { Delegation } from "../../../plugins/multi-tenant-session-account/types"
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi"
import { config } from "../config"
import {
    Test_ERC20Address,
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

describe("7710 SessionAccount", () => {
    let publicClient: PublicClient
    let mainDelegatorAccount: SmartAccount<KernelSmartAccountImplementation>
    let kernelClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >
    let sessionAccount: SmartAccount<SessionAccountImplementation>
    let sessionAccountClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >
    let delegations: Delegation[]
    const enforcerVersion: ENFORCER_VERSION = "v0_2"
    let zeroDevPaymaster: ZeroDevPaymasterClient

    beforeAll(async () => {
        const ownerPrivateKey = process.env.TEST_PRIVATE_KEY
        if (!ownerPrivateKey) {
            throw new Error("TEST_PRIVATE_KEY is not set")
        }
        publicClient = await getPublicClient()
        zeroDevPaymaster = getZeroDevPaymasterClient()
        mainDelegatorAccount = await getEcdsaKernelAccountWithRandomSigner()
        kernelClient = await getKernelAccountClient({
            account: mainDelegatorAccount,
            paymaster: zeroDevPaymaster
        })

        const installTx = await kernelClient.sendTransaction({
            to: kernelClient.account.address,
            value: 0n,
            data: getInstallDMAsExecutorCallData()
        })
        console.log({ installTx })
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
                dmActionsEip7710({ enforcerVersion })
            )

            const mainDeleGatorSignature = await kernelClientDM.signDelegation({
                delegation: delegations[0]
            })
            console.log({ mainDeleGatorSignature })
            delegations[0].signature = mainDeleGatorSignature
            const initCode = await mainDelegatorAccount.generateInitCode()
            sessionAccount = await getSessionAccount(
                delegations,
                privateSessionKey,
                initCode
            )
            sessionAccountClient = await getKernelAccountClient({
                // @ts-ignore
                account: sessionAccount,
                paymaster: zeroDevPaymaster
            })
            const userOpHash = await sessionAccountClient.sendUserOperation({
                callData: await sessionAccount.encodeCalls([
                    {
                        to: zeroAddress,
                        data: "0x",
                        value: 0n
                    }
                ])
            })
            const receipt =
                await sessionAccountClient.waitForUserOperationReceipt({
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
                dmActionsEip7710({ enforcerVersion })
            )

            const installDMAndDelegateHash =
                await kernelClientDM.installDMAndDelegate({
                    caveats,
                    sessionKeyAddress: sessionKeyAccount.address
                })

            console.log(
                "transactionHash",
                `https://sepolia.etherscan.io/tx/${installDMAndDelegateHash}`
            )

            const initCode = await mainDelegatorAccount.generateInitCode()
            sessionAccount = await getSessionAccount(
                delegations,
                privateSessionKey,
                initCode
            )
            sessionAccountClient = await getKernelAccountClient({
                // @ts-ignore
                account: sessionAccount,
                paymaster: zeroDevPaymaster
            })

            await mintToAccount(
                kernelClient.account.client as PublicClient,
                kernelClient,
                kernelClient.account.address,
                parseEther("0.999999999")
            )

            const amountToTransfer = 10000n
            const transferData = encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [sessionKeyAccount.address, amountToTransfer]
            })
            const userOpHash = await sessionAccountClient.sendUserOperation({
                callData: await sessionAccount.encodeCalls([
                    {
                        to: Test_ERC20Address,
                        data: transferData,
                        value: 0n
                    }
                ])
            })
            const receipt =
                await sessionAccountClient.waitForUserOperationReceipt({
                    hash: userOpHash
                })
            console.log(
                "transactionHash",
                `https://sepolia.etherscan.io/tx/${receipt.receipt.transactionHash}`
            )
        },
        TEST_TIMEOUT
    )

    // test(
    //     "enable cab",
    //     async () => {
    //         const kernelCabClient = createKernelCABClient(kernelClient, {
    //             transport: http(CAB_PAYMASTER_SERVER_URL),
    //             entryPoint: getEntryPoint(),
    //             chain: sepolia,
    //             cabVersion: CAB_V0_2_1
    //         })
    //         console.log("kernelCabClient addr", kernelCabClient.account.address)
    //         await kernelCabClient.enableCAB({
    //             tokens: [{ name: "6TEST", networks: [sepolia.id] }]
    //         })
    //         // await mintToAccount(
    //         //     kernelClient.account.client as PublicClient,
    //         //     kernelClient,
    //         //     "0x066aB66D299600E006abD1af0d41AC872b77aeb6",
    //         //     parseEther("0.99999999999")
    //         // )
    //         // await mintToAccount(
    //         //     kernelClient.account.client as PublicClient,
    //         //     kernelClient,
    //         //     "0x066aB66D299600E006abD1af0d41AC872b77aeb6",
    //         //     parseEther("0.99999999999")
    //         // )

    //         const mainDelegatorAccountOPSepolia =
    //             await getEcdsaKernelAccountWithRandomSigner(
    //                 undefined,
    //                 optimismSepolia.id
    //             )

    //         const kernelClientOPSepolia = createKernelAccountClient({
    //             account: mainDelegatorAccountOPSepolia,
    //             chain: optimismSepolia,
    //             bundlerTransport: http(
    //                 getBundlerRpc(config["v0.7"][optimismSepolia.id].projectId),
    //                 { timeout: 100_000 }
    //             ),
    //             middleware: {
    //                 sponsorUserOperation: async ({ userOperation }) => {
    //                     const zeroDevPaymaster = createZeroDevPaymasterClient({
    //                         chain: optimismSepolia,
    //                         transport: http(
    //                             getPaymasterRpc(
    //                                 config["v0.7"][optimismSepolia.id].projectId
    //                             )
    //                         ),
    //                         entryPoint: getEntryPoint()
    //                     })
    //                     return zeroDevPaymaster.sponsorUserOperation({
    //                         userOperation,
    //                         entryPoint: getEntryPoint()
    //                     })
    //                 }
    //             },
    //             entryPoint: getEntryPoint()
    //         })

    //         await mintToAccount(
    //             kernelClientOPSepolia.account.client as PublicClient,
    //             kernelClientOPSepolia,
    //             kernelClientOPSepolia.account.address,
    //             100000000n
    //         )

    //         const kernelCabClientOPSepolia = createKernelCABClient(
    //             kernelClientOPSepolia,
    //             {
    //                 transport: http(CAB_PAYMASTER_SERVER_URL),
    //                 entryPoint: getEntryPoint(),
    //                 chain: optimismSepolia,
    //                 cabVersion: CAB_V0_2_1
    //             }
    //         )
    //         console.log(
    //             "kernelCabClientOPSepolia addr",
    //             kernelCabClientOPSepolia.account.address
    //         )
    //         await kernelCabClientOPSepolia.enableCAB({
    //             tokens: [{ name: "6TEST", networks: [optimismSepolia.id] }]
    //         })
    //         while (true) {
    //             const cabClient = createPublicClient({
    //                 transport: http(CAB_PAYMASTER_SERVER_URL)
    //             })

    //             const cabBalance = await cabClient.request({
    //                 // @ts-ignore
    //                 method: "pm_getCabAvailableRepayTokens",
    //                 params: [kernelCabClientOPSepolia.account.address]
    //             })
    //             console.log("CAB balance:", cabBalance)
    //             // @ts-ignore
    //             if (cabBalance?.availableRepayTokens?.length) {
    //                 break
    //             }
    //         }
    //     },
    //     TEST_TIMEOUT
    // )
    // test(
    //     "Send tx with cab caveat from kernelAccount through sessionAccount",
    //     async () => {
    //         const privateSessionKey = generatePrivateKey()
    //         const sessionKeyAccount = privateKeyToAccount(privateSessionKey)
    //         const allowedParamsCaveat = toAllowedParamsEnforcer({
    //             permissions: [
    //                 {
    //                     abi: TEST_ERC20Abi,
    //                     target: Test_ERC20Address,
    //                     functionName: "transfer",
    //                     args: [
    //                         {
    //                             condition: ParamCondition.EQUAL,
    //                             value: sessionKeyAccount.address
    //                         },
    //                         null
    //                     ]
    //                 }
    //             ]
    //         })
    //         const cabCaveat = await toCABPaymasterEnforcer({
    //             accountAddress: mainDelegatorAccount.address,
    //             enforcerVersion
    //         })
    //         const caveats = [cabCaveat]

    //         delegations = [
    //             {
    //                 delegator: mainDelegatorAccount.address,
    //                 delegate: sessionKeyAccount.address,
    //                 authority: ROOT_AUTHORITY,
    //                 caveats,
    //                 salt: 0n,
    //                 signature: "0x"
    //             }
    //         ]

    //         const kernelClientDM = kernelClient.extend(
    //             dmActionsEip7710({ enforcerVersion })
    //         )

    //         const mainDeleGatorSignature = await kernelClientDM.signDelegation({
    //             delegation: delegations[0]
    //         })
    //         console.log({ mainDeleGatorSignature })
    //         delegations[0].signature = mainDeleGatorSignature
    //         const initCode = await mainDelegatorAccount.generateInitCode()
    //         sessionAccount = await getSessionAccount(
    //             delegations,
    //             privateSessionKey,
    //             initCode
    //         )
    //         sessionAccountClient = await getKernelAccountClient({
    //             // @ts-ignore: fix return type error
    //             account: sessionAccount,
    //             paymaster: zeroDevPaymaster
    //         })

    //         // await mintToAccount(
    //         //     kernelClient.account.client as PublicClient,
    //         //     kernelClient,
    //         //     kernelClient.account.address,
    //         //     100000000n
    //         // )

    //         const amountToTransfer = 10000n
    //         const transferData = encodeFunctionData({
    //             abi: TEST_ERC20Abi,
    //             functionName: "transfer",
    //             args: [sessionKeyAccount.address, amountToTransfer]
    //         })
    //         const sessionAccountClientDM = sessionAccountClient.extend(
    //             dmActionsEip7710({ enforcerVersion })
    //         )
    //         const repayTokens = [
    //             {
    //                 address:
    //                     "0x3870419ba2bbf0127060bcb37f69a1b1c090992b" as Address,
    //                 chainId: optimismSepolia.id
    //             }
    //         ]
    //         // const txHash = await sessionAccountClientDM.sendTransactionWithCAB({
    //         //     to: Test_ERC20Address,
    //         //     data: transferData,
    //         //     value: 0n,
    //         //     repayTokens
    //         // })
    //         const userOpHash = await sessionAccountClient.sendUserOperation({
    //             callData: await sessionAccountClientDM.encodeCallDataWithCAB({
    //                 calls: [
    //                     {
    //                         to: Test_ERC20Address,
    //                         data: transferData,
    //                         value: 0n
    //                     }
    //                 ],
    //                 repayTokens
    //             })
    //         })

    //         const receipt =
    //             await sessionAccountClient.waitForUserOperationReceipt({
    //                 hash: userOpHash,
    //                 timeout: TEST_TIMEOUT
    //             })

    //         console.log(
    //             "transactionHash",
    //             `https://sepolia.etherscan.io/tx/${receipt.receipt.transactionHash}`
    //         )
    //     },
    //     TEST_TIMEOUT
    // )
})
