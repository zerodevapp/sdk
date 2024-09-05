import type { RepayTokenInfo } from "@zerodev/cab"
import {
    http,
    type Address,
    type Hex,
    createPublicClient,
    encodeAbiParameters
} from "viem"
import { CAB_PAYMASTER_SERVER_URL } from "../../constants.js"
import type { Caveat } from "../../types.js"
import { type SponsorTokenInfo, cabAllowancesAbiType } from "./utils.js"

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
    "0x55c9964c836468ac3847ebeE3C47950Aaf59F1Ce"

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
