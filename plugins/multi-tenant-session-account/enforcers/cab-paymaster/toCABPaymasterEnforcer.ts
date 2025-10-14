import {
    http,
    type Address,
    type Hex,
    createPublicClient,
    encodeAbiParameters
} from "viem"
import { CAB_PAYMASTER_SERVER_URL } from "../../constants.js"
import type { Caveat } from "../../types.js"
import type { RepayTokenInfo } from "./type.js"
import { type SponsorTokenInfo, cabAllowancesAbiType } from "./utils.js"

export type CABPaymasterEnforcerArgs = {
    indexes: bigint[]
    spender: Address
    nonce: bigint
    sponsorTokenData: SponsorTokenInfo[]
    repayTokenData: RepayTokenInfo[]
    paymasterSignature: Hex
}

export type ENFORCER_VERSION = "v0_1" | "v0_2"

export type CABPaymasterEnforcerParams = {
    accountAddress: Address
    enforcerVersion: ENFORCER_VERSION
}

export type Allowance = {
    token: Address
    amount: bigint
    vaults: { chainId: bigint; vault: Address; multiplier: bigint }[]
}

export const CABPaymasterEnforcerAddressV0_1 =
    "0x78b09791499931CC36919Ef6A38BEC8B569E7f57"

export const CABPaymasterEnforcerAddressV0_2 =
    "0x9A3b8B3eAEDf076956b12A5d1a0248FDD2CA9E78"

export const getEnforcerAddress = (version: ENFORCER_VERSION) => {
    if (version === "v0_1") {
        return CABPaymasterEnforcerAddressV0_1
    } else {
        return CABPaymasterEnforcerAddressV0_2
    }
}

export async function toCABPaymasterEnforcer({
    accountAddress,
    enforcerVersion = "v0_2"
}: CABPaymasterEnforcerParams): Promise<Caveat> {
    const enforcerAddress = getEnforcerAddress(enforcerVersion)
    const cabClient = createPublicClient({
        transport: http(CAB_PAYMASTER_SERVER_URL)
    })

    const cabBalance: {
        availableRepayTokens: {
            chainId: Hex
            vault: Address
            token: Address
            amount: Hex
        }[]
    } = await cabClient.request({
        // @ts-ignore
        method: "pm_getCabAvailableRepayTokens",
        params: [accountAddress]
    })
    const allowances = cabBalance.availableRepayTokens.reduce<Allowance[]>(
        (acc, { token, amount, chainId, vault }) => {
            let tokenEntry = acc.find((entry) => entry.token === token)
            if (!tokenEntry) {
                tokenEntry = { token, amount: BigInt(amount), vaults: [] }
                acc.push(tokenEntry)
            }
            tokenEntry.vaults.push({
                chainId: BigInt(chainId),
                vault,
                multiplier: 0n
            })
            return acc
        },
        []
    )

    return {
        enforcer: enforcerAddress,
        terms: encodeAbiParameters([cabAllowancesAbiType], [allowances]),
        args: "0x"
    }
}
