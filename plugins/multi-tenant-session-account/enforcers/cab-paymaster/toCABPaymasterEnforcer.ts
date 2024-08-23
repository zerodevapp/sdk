import type { RepayTokenInfo } from "@zerodev/cab"
import { type Address, type Hex, concatHex, toHex } from "viem"
import type { Caveat } from "../../types.js"
import { type SponsorTokenInfo, encodePaymasterTokens } from "./utils.js"

export type CABPaymasterEnforcerArgs = {
    spender: Address
    nonce: bigint
    sponsorTokenData: SponsorTokenInfo[]
    repayTokenData: RepayTokenInfo[]
    paymasterSignature: Hex
}

export type CABPaymasterEnforcerParams = {
    enforcerAddress?: Address
}

export const CABPaymasterEnforcerAddress =
    "0x066aB66D299600E006abD1af0d41AC872b77aeb6"

export function toCABPaymasterEnforcer({
    enforcerAddress = CABPaymasterEnforcerAddress
}: CABPaymasterEnforcerParams): Caveat<CABPaymasterEnforcerArgs> {
    return {
        enforcer: enforcerAddress,
        args: "0x",
        getArgs: ({
            nonce,
            paymasterSignature,
            repayTokenData,
            spender,
            sponsorTokenData
        }: CABPaymasterEnforcerArgs) => {
            const { sponsorTokenDataEncoded, repayTokenDataEncoded } =
                encodePaymasterTokens(sponsorTokenData, repayTokenData)

            return concatHex([
                spender,
                toHex(nonce, { size: 32 }),
                sponsorTokenDataEncoded,
                repayTokenDataEncoded,
                paymasterSignature
            ])
        },
        terms: "0x"
    }
}
