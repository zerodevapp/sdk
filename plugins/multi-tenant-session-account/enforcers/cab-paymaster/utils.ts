import type { RepayTokenInfo } from "@zerodev/cab"
import {
    type Address,
    type Hex,
    concatHex,
    encodeAbiParameters,
    encodeFunctionData,
    erc20Abi,
    isHex,
    pad,
    toHex
} from "viem"
import type { CABPaymasterEnforcerArgs } from "./toCABPaymasterEnforcer"

export type SponsorTokenInfo = {
    amount: bigint
    address: Address
    margin: bigint
}
export type Call = {
    to: Address
    data: Hex
    value: bigint
}

export const withdrawCall = ({
    paymaster,
    accountAddress,
    sponsorTokensInfo
}: {
    paymaster: Address
    accountAddress: Address
    sponsorTokensInfo: SponsorTokenInfo[]
}): Call[] => {
    return sponsorTokensInfo.map(({ address, amount }) => ({
        to: address,
        data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "transferFrom",
            args: [paymaster, accountAddress, amount]
        }),
        value: 0n
    }))
}

export const encodePaymasterTokens = (
    sponsorTokenData: SponsorTokenInfo[],
    repayTokenData: RepayTokenInfo[]
): { sponsorTokenDataEncoded: Hex; repayTokenDataEncoded: Hex } => {
    let sponsorTokenDataEncoded = sponsorTokenData.reduce(
        (acc, currentValue) =>
            concatHex([
                acc,
                currentValue.address,
                isHex(currentValue.amount)
                    ? pad(currentValue.amount, { size: 32 })
                    : toHex(BigInt(currentValue.amount), { size: 32 }),
                isHex(currentValue.margin)
                    ? pad(currentValue.margin, { size: 32 })
                    : toHex(BigInt(currentValue.margin), { size: 32 })
            ]),
        "0x" as Hex
    )
    sponsorTokenDataEncoded = concatHex([
        toHex(sponsorTokenData.length, { size: 1 }),
        sponsorTokenDataEncoded
    ])
    let repayTokenDataEncoded = repayTokenData.reduce(
        (acc, currentValue) =>
            concatHex([
                acc,
                currentValue.vault,
                isHex(currentValue.amount)
                    ? pad(currentValue.amount, { size: 32 })
                    : toHex(BigInt(currentValue.amount), { size: 32 }),
                isHex(currentValue.chainId)
                    ? pad(currentValue.chainId, { size: 32 })
                    : toHex(BigInt(currentValue.chainId), { size: 32 })
            ]),
        "0x" as Hex
    )
    repayTokenDataEncoded = concatHex([
        toHex(repayTokenData.length, { size: 1 }),
        repayTokenDataEncoded,
        pad("0x00", { size: 1 }) // repayGasData = 0
    ])

    return {
        sponsorTokenDataEncoded,
        repayTokenDataEncoded
    }
}

export const encodeCABEnforcerArgs = ({
    indexes,
    nonce,
    paymasterSignature,
    repayTokenData,
    spender,
    sponsorTokenData
}: CABPaymasterEnforcerArgs) => {
    const { sponsorTokenDataEncoded, repayTokenDataEncoded } =
        encodePaymasterTokens(sponsorTokenData, repayTokenData)

    return encodeAbiParameters(
        [
            { type: "uint256[]", name: "indexes" },
            { type: "bytes", name: "data" }
        ],
        [
            indexes,
            concatHex([
                spender,
                toHex(nonce, { size: 32 }),
                sponsorTokenDataEncoded,
                repayTokenDataEncoded,
                paymasterSignature
            ])
        ]
    )
}

export const cabAllowancesAbiType = {
    name: "RepayAllowances",
    type: "tuple[]",
    components: [
        {
            name: "token",
            type: "address"
        },
        {
            name: "amount",
            type: "uint256"
        },
        {
            name: "vaults",
            type: "tuple[]",
            components: [
                {
                    name: "chainId",
                    type: "uint256"
                },
                {
                    name: "vault",
                    type: "address"
                },
                {
                    name: "multiplier",
                    type: "uint256"
                }
            ]
        }
    ]
} as const
