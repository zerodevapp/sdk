import {
    type RepayTokenInfo,
    type RepayTokens,
    createInvoiceCall,
    withdrawCall
} from "@zerodev/cab"
import { KernelV3ExecuteAbi } from "@zerodev/sdk"
import {
    AccountOrClientNotFoundError,
    deepHexlify,
    parseAccount,
    waitForUserOperationReceipt
} from "permissionless"
import type { SmartAccount } from "permissionless/accounts"
import { sendUserOperation as sendUserOperationBundler } from "permissionless/actions"
import {
    type SendTransactionWithPaymasterParameters,
    prepareUserOperationRequest
} from "permissionless/actions/smartAccount"
import type {
    EntryPoint,
    GetEntryPointVersion,
    Prettify,
    UserOperation
} from "permissionless/types"
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hash,
    type Hex,
    type Transport,
    concatHex,
    createPublicClient,
    encodeAbiParameters,
    encodeFunctionData,
    pad,
    toHex
} from "viem"
import { getChainId } from "viem/actions"
import { getAction } from "viem/utils"
import type { SessionAccount } from "../account/createSessionAccount.js"
import {
    CAB_PAYMASTER_SERVER_URL,
    DMVersionToAddressMap
} from "../constants.js"
import {
    type SponsorTokenInfo,
    encodePaymasterTokens
} from "../enforcers/cab-paymaster/index.js"
import {
    CABPaymasterEnforcerAddress,
    type CABPaymasterEnforcerArgs
} from "../enforcers/cab-paymaster/toCABPaymasterEnforcer.js"
import type { Caveat } from "../types.js"
import { toDelegationHash } from "../utils/index.js"

export type SendTransactionWithCABParameters<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined,
    TChainOverride extends Chain | undefined = Chain | undefined
> = Prettify<
    SendTransactionWithPaymasterParameters<
        entryPoint,
        TChain,
        TAccount,
        TChainOverride
    > & {
        repayTokens: RepayTokens
    }
>
/**
 * Creates, signs, and sends a new transaction to the network.
 * This function also allows you to sponsor this transaction if sender is a smartAccount
 *
 * - Docs: https://viem.sh/docs/actions/wallet/sendTransaction.html
 * - Examples: https://stackblitz.com/github/wagmi-dev/viem/tree/main/examples/transactions/sending-transactions
 * - JSON-RPC Methods:
 *   - JSON-RPC Accounts: [`eth_sendTransaction`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sendtransaction)
 *   - Local Accounts: [`eth_sendRawTransaction`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sendrawtransaction)
 *
 * @param client - Client to use
 * @param parameters - {@link SendTransactionParameters}
 * @returns The [Transaction](https://viem.sh/docs/glossary/terms.html#transaction) hash.
 *
 * @example
 * import { createWalletClient, custom } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { sendTransaction } from 'viem/wallet'
 *
 * const client = createWalletClient({
 *   chain: mainnet,
 *   transport: custom(window.ethereum),
 * })
 * const hash = await sendTransaction(client, {
 *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
 *   to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
 *   value: 1000000000000000000n,
 * })
 *
 * @example
 * // Account Hoisting
 * import { createWalletClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { mainnet } from 'viem/chains'
 * import { sendTransaction } from 'viem/wallet'
 *
 * const client = createWalletClient({
 *   account: privateKeyToAccount('0x…'),
 *   chain: mainnet,
 *   transport: http(),
 * })
 * const hash = await sendTransaction(client, {
 *   to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
 *   value: 1000000000000000000n,
 * })
 */
export async function sendTransactionWithCAB<
    TChain extends Chain | undefined,
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChainOverride extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: SendTransactionWithCABParameters<
        entryPoint,
        TChain,
        TAccount,
        TChainOverride
    >
): Promise<Hash> {
    const {
        account: account_ = client.account,
        data,
        to,
        value,
        // middleware,
        repayTokens
    } = args

    if (!account_) {
        throw new AccountOrClientNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })
    }

    const account = parseAccount(account_) as SessionAccount<entryPoint>
    const chainId = client.chain ? client.chain.id : await getChainId(client)

    if (!to) throw new Error("Missing to address")

    if (account.type !== "local") {
        throw new Error("RPC account type not supported")
    }

    const cabClient = createPublicClient({
        transport: http(CAB_PAYMASTER_SERVER_URL)
    })

    let callData = encodeFunctionData({
        abi: KernelV3ExecuteAbi,
        functionName: "execute",
        args: [
            concatHex([
                "0x00", // 1 byte
                "0x00", // 1 byte
                "0x00000000", // 4 bytes
                "0x00000000", // 4 bytes
                pad("0x00000000", { size: 22 })
            ]),
            concatHex([to, toHex(value ?? 0n, { size: 32 }), data ?? "0x"])
        ]
    })

    const delegatorAccountAddress =
        account.delegations[account.delegations.length - 1].delegator
    const accountNonce = await account.getNonce()

    const cabPaymasterTokensResponse: {
        paymaster: Address
        sponsorTokensInfo: SponsorTokenInfo[]
        repayTokensInfo: RepayTokenInfo[]
    } = await cabClient.request({
        // @ts-expect-error
        method: "pm_getCabPaymasterTokens",
        params: [
            // @ts-expect-error
            deepHexlify({
                sender: delegatorAccountAddress,
                callData,
                nonce: accountNonce,
                maxFeePerGas: 0n,
                callGasLimit: 0n,
                verificationGasLimit: 0n,
                preVerificationGas: 0n,
                paymasterPostOpGasLimit: 0n,
                paymasterVerificationGasLimit: 0n
            }) as Partial<UserOperation<GetEntryPointVersion<entryPoint>>>,
            account.entryPoint,
            // @ts-expect-error
            chainId,
            // @ts-expect-error
            repayTokens
        ]
    })

    const cabEnforcerIndex = account.delegations[
        account.delegations.length - 1
    ].caveats.findIndex(
        (c) =>
            c.enforcer.toLowerCase() ===
            CABPaymasterEnforcerAddress.toLowerCase()
    )
    const cabEnforcer =
        account.delegations[account.delegations.length - 1].caveats[
            cabEnforcerIndex
        ]

    const calls = [
        ...withdrawCall({
            accountAddress: delegatorAccountAddress,
            paymaster: cabPaymasterTokensResponse.paymaster,
            sponsorTokensInfo: cabPaymasterTokensResponse.sponsorTokensInfo
        }),
        {
            to,
            value: value ?? 0n,
            data: data ?? ("0x" as Hex)
        },
        createInvoiceCall({
            chainId,
            account: delegatorAccountAddress,
            nonce: accountNonce,
            paymaster: cabPaymasterTokensResponse.paymaster,
            repayTokensInfo: cabPaymasterTokensResponse.repayTokensInfo
        })
    ]
    callData = encodeFunctionData({
        abi: KernelV3ExecuteAbi,
        functionName: "execute",
        args: [
            concatHex([
                "0x01", // 1 byte
                "0x00", // 1 byte
                "0x00000000", // 4 bytes
                "0x00000000", // 4 bytes
                pad("0x00000000", { size: 22 })
            ]),
            encodeAbiParameters(
                [
                    {
                        name: "executionBatch",
                        type: "tuple[]",
                        components: [
                            {
                                name: "target",
                                type: "address"
                            },
                            {
                                name: "value",
                                type: "uint256"
                            },
                            {
                                name: "callData",
                                type: "bytes"
                            }
                        ]
                    }
                ],
                [
                    calls.map((arg) => {
                        return {
                            target: arg.to,
                            value: arg.value,
                            callData: arg.data
                        }
                    })
                ]
            )
        ]
    })

    const { repayTokenDataEncoded, sponsorTokenDataEncoded } =
        encodePaymasterTokens(
            cabPaymasterTokensResponse.sponsorTokensInfo,
            cabPaymasterTokensResponse.repayTokensInfo
        )
    const { paymasterSignature }: { paymasterSignature: Hex } =
        await cabClient.request({
            // @ts-expect-error
            method: "pm_getCabEnforcerPaymasterData",
            params: [
                // @ts-expect-error
                deepHexlify({
                    sender: delegatorAccountAddress,
                    callData,
                    nonce: accountNonce,
                    maxFeePerGas: 0n,
                    callGasLimit: 0n,
                    verificationGasLimit: 0n,
                    preVerificationGas: 0n,
                    paymasterPostOpGasLimit: 0n,
                    paymasterVerificationGasLimit: 0n
                }) as Partial<UserOperation<GetEntryPointVersion<entryPoint>>>,
                account.entryPoint,
                // @ts-expect-error
                chainId,
                // @ts-expect-error
                DMVersionToAddressMap["1.0.0"].delegationManagerAddress,
                // @ts-expect-error
                toDelegationHash(
                    account.delegations[account.delegations.length - 1]
                ),
                // @ts-expect-error
                concatHex([
                    "0x01", // 1 byte
                    "0x00", // 1 byte
                    "0x00000000", // 4 bytes
                    "0x00000000", // 4 bytes
                    pad("0x00000000", { size: 22 })
                ]),
                // @ts-expect-error
                encodeAbiParameters(
                    [
                        {
                            name: "executionBatch",
                            type: "tuple[]",
                            components: [
                                {
                                    name: "target",
                                    type: "address"
                                },
                                {
                                    name: "value",
                                    type: "uint256"
                                },
                                {
                                    name: "callData",
                                    type: "bytes"
                                }
                            ]
                        }
                    ],
                    [
                        calls.map((arg) => {
                            return {
                                target: arg.to,
                                value: arg.value,
                                callData: arg.data
                            }
                        })
                    ]
                ),
                // @ts-expect-error
                sponsorTokenDataEncoded,
                // @ts-expect-error
                repayTokenDataEncoded
            ]
        })
    if (cabEnforcer) {
        const cabEnforcerArgs = (
            cabEnforcer as Caveat<CABPaymasterEnforcerArgs>
        ).getArgs({
            nonce: accountNonce,
            spender: delegatorAccountAddress,
            paymasterSignature,
            repayTokenData: cabPaymasterTokensResponse.repayTokensInfo,
            sponsorTokenData: cabPaymasterTokensResponse.sponsorTokensInfo
        })
        account.delegations[account.delegations.length - 1].caveats[
            cabEnforcerIndex
        ] = {
            ...account.delegations[account.delegations.length - 1].caveats[
                cabEnforcerIndex
            ],
            args: cabEnforcerArgs
        }
    }
    callData = await account.encodeCallData([
        ...withdrawCall({
            accountAddress: delegatorAccountAddress,
            paymaster: cabPaymasterTokensResponse.paymaster,
            sponsorTokensInfo: cabPaymasterTokensResponse.sponsorTokensInfo
        }),
        {
            to,
            value: value ?? 0n,
            data: data ?? "0x"
        },
        createInvoiceCall({
            chainId,
            account: delegatorAccountAddress,
            nonce: accountNonce,
            paymaster: cabPaymasterTokensResponse.paymaster,
            repayTokensInfo: cabPaymasterTokensResponse.repayTokensInfo
        })
    ])

    const userOperation = (await getAction(
        client,
        prepareUserOperationRequest<entryPoint>,
        "prepareUserOperationRequest"
    )({
        ...args,
        userOperation: {
            callData
        },
        account
    })) as UserOperation<GetEntryPointVersion<entryPoint>>

    userOperation.signature = await account.signUserOperation(
        userOperation as UserOperation<GetEntryPointVersion<entryPoint>>
    )

    const userOpHash = await sendUserOperationBundler(client, {
        userOperation: userOperation as UserOperation<
            GetEntryPointVersion<entryPoint>
        >,
        entryPoint: account.entryPoint
    })

    const userOperationReceipt = await getAction(
        client,
        waitForUserOperationReceipt,
        "waitForUserOperationReceipt"
    )({
        hash: userOpHash
    })

    return userOperationReceipt?.receipt.transactionHash
}
