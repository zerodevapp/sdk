import type { RepayTokenInfo } from "@zerodev/cab"
import {
    type Address,
    type Hex,
    createPublicClient,
    encodeAbiParameters,
    http
} from "viem"
import type { Caveat } from "../../types.js"
import { type SponsorTokenInfo, cabAllowancesAbiType } from "./utils.js"
import { CAB_PAYMASTER_SERVER_URL } from "../../constants.js"

export type CABPaymasterEnforcerArgs = {
    indexes: bigint[]
    spender: Address
    nonce: bigint
    sponsorTokenData: SponsorTokenInfo[]
    repayTokenData: RepayTokenInfo[]
    paymasterSignature: Hex
}

export type CABPaymasterEnforcerParams = {
    accountAddress: Address
    enforcerAddress?: Address
}

export type Allowance = {
    token: Address
    amount: bigint
    vaults: { chainId: bigint; vault: Address; multiplier: bigint }[]
}

export const CABPaymasterEnforcerAddress =
    "0xe899da923bc1750f8411805bf7d6db587fb3656f"

export async function toCABPaymasterEnforcer({
    accountAddress,
    enforcerAddress = CABPaymasterEnforcerAddress
}: CABPaymasterEnforcerParams): Promise<Caveat> {
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
