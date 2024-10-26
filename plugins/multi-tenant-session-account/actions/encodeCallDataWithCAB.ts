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
    decodeAbiParameters,
    encodeAbiParameters,
    encodeFunctionData,
    isAddressEqual,
    pad,
    toHex
} from "viem"
import { getChainId } from "viem/actions"
import type { SessionAccount } from "../account/createSessionAccount.js"
import {
    CAB_PAYMASTER_SERVER_URL,
    DMVersionToAddressMap
} from "../constants.js"
import {
    type SponsorTokenInfo,
    cabAllowancesAbiType,
    encodeCABEnforcerArgs,
    encodePaymasterTokens
} from "../enforcers/cab-paymaster/index.js"
import {
    type ENFORCER_VERSION,
    getEnforcerAddress
} from "../enforcers/cab-paymaster/toCABPaymasterEnforcer.js"
import { toDelegationHash } from "../utils/index.js"

export type EncodeCallDataWithCABParameters<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined =
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined,
    TChainOverride extends Chain | undefined = Chain | undefined
> = Prettify<
    GetAccountParameter<entryPoint, TTransport, TChain, TAccount> &
        GetChainParameter<TChain, TChainOverride> & {
            calls: { to: Address; value: bigint; data: Hex }[]
            repayTokens: RepayTokens
            enforcerVersion?: ENFORCER_VERSION
        }
>

export async function encodeCallDataWithCAB<
    TChain extends Chain | undefined,
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChainOverride extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined =
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: EncodeCallDataWithCABParameters<
        entryPoint,
        TTransport,
        TChain,
        TAccount,
        TChainOverride
    >
): Promise<Hash> {
    const cabEnforcerAddress = getEnforcerAddress(
        args.enforcerVersion ?? "v0_2"
    )
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
            repayTokens,
            // @ts-expect-error
            cabEnforcerAddress
        ]
    })
    const cabEnforcerIndex = account.delegations[
        account.delegations.length - 1
    ].caveats.findIndex(
        (c) => c.enforcer.toLowerCase() === cabEnforcerAddress.toLowerCase()
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
                repayTokenDataEncoded,
                // @ts-expect-error
                cabEnforcerAddress
            ]
        })
    if (cabEnforcer) {
        const [allowances] = decodeAbiParameters(
            [cabAllowancesAbiType],
            cabEnforcer.terms
        )
        const indexes = cabPaymasterTokensResponse.repayTokensInfo.map(
            (rpyTkn, rpyIdx) => {
                let sponsorIndex = 0
                let repayIndex = 0
                for (const [allowanceIdx, allowance] of allowances.entries()) {
                    repayIndex = allowance.vaults.findIndex(
                        (vault) =>
                            vault.chainId === BigInt(rpyTkn.chainId) &&
                            isAddressEqual(vault.vault, rpyTkn.vault)
                    )
                    if (
                        repayIndex !== -1 &&
                        isAddressEqual(
                            cabPaymasterTokensResponse.sponsorTokensInfo[rpyIdx]
                                .address,
                            allowance.token
                        )
                    ) {
                        sponsorIndex = allowanceIdx
                        break
                    }
                }
                if (repayIndex === -1) {
                    throw new Error("Repay token not found in allowances")
                }
                return BigInt(
                    concatHex([
                        toHex(sponsorIndex, { size: 16 }),
                        toHex(repayIndex, { size: 16 })
                    ])
                )
            }
        )
        const cabEnforcerArgs = encodeCABEnforcerArgs({
            indexes,
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
