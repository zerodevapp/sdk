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
    parseAccount
} from "permissionless"
import type { SmartAccount } from "permissionless/accounts"
import type {
    EntryPoint,
    GetAccountParameter,
    GetEntryPointVersion,
    Prettify,
    UserOperation
} from "permissionless/types"
import {
    http,
    type Address,
    type Chain,
    type Client,
    type GetChainParameter,
    type Hash,
    type Hex,
    type Transport,
    concatHex,
    createPublicClient,
    encodeAbiParameters,
    encodeFunctionData,
    pad
} from "viem"
import { getChainId } from "viem/actions"
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
    toCABPaymasterEnforcer
} from "../enforcers/cab-paymaster/toCABPaymasterEnforcer.js"
import { toDelegationHash } from "../utils/index.js"

export type EncodeCallDataWithCABParameters<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined,
    TChainOverride extends Chain | undefined = Chain | undefined
> = Prettify<
    GetAccountParameter<entryPoint, TAccount> &
        GetChainParameter<TChain, TChainOverride> & {
            calls: { to: Address; value: bigint; data: Hex }[]
            repayTokens: RepayTokens
        }
>

export async function encodeCallDataWithCAB<
    TChain extends Chain | undefined,
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChainOverride extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: EncodeCallDataWithCABParameters<
        entryPoint,
        TChain,
        TAccount,
        TChainOverride
    >
): Promise<Hash> {
    const { account: account_ = client.account, calls, repayTokens } = args

    if (!account_) {
        throw new AccountOrClientNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })
    }

    const account = parseAccount(account_) as SessionAccount<entryPoint>
    const chainId = client.chain ? client.chain.id : await getChainId(client)

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

    const calls_ = [
        ...withdrawCall({
            accountAddress: delegatorAccountAddress,
            paymaster: cabPaymasterTokensResponse.paymaster,
            sponsorTokensInfo: cabPaymasterTokensResponse.sponsorTokensInfo
        }),
        ...calls,
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
                    calls_.map((arg) => {
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
                        calls_.map((arg) => {
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
        const cabEnforcerArgs = toCABPaymasterEnforcer({}).getArgs({
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
    return await account.encodeCallData([
        ...withdrawCall({
            accountAddress: delegatorAccountAddress,
            paymaster: cabPaymasterTokensResponse.paymaster,
            sponsorTokensInfo: cabPaymasterTokensResponse.sponsorTokensInfo
        }),
        ...calls,
        createInvoiceCall({
            chainId,
            account: delegatorAccountAddress,
            nonce: accountNonce,
            paymaster: cabPaymasterTokensResponse.paymaster,
            repayTokensInfo: cabPaymasterTokensResponse.repayTokensInfo
        })
    ])
}
