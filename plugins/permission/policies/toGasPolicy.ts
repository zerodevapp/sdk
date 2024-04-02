import { type Address, concatHex, encodeAbiParameters, zeroAddress } from "viem"
import { PolicyFlags } from "../constants.js"
import { GAS_POLICY_CONTRACT } from "../constants.js"
import type { Policy, PolicyParams } from "../types.js"

export type GasPolicyParams = PolicyParams & {
    allowed: bigint
    enforcePaymaster?: boolean
    allowedPaymaster?: Address
    type?: "gas"
}

export async function toGasPolicy({
    policyAddress = GAS_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    allowed,
    enforcePaymaster = false,
    allowedPaymaster = zeroAddress,
    type = "gas"
}: GasPolicyParams): Promise<Policy> {
    return {
        getPolicyData: () => {
            return encodeAbiParameters(
                [
                    { name: "allowed", type: "uint128" },
                    { name: "enforcePaymaster", type: "bool" },
                    { name: "allowedPaymaster", type: "address" }
                ],
                [allowed, enforcePaymaster, allowedPaymaster]
            )
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        },
        policyParams: {
            type,
            policyAddress,
            policyFlag,
            allowed,
            enforcePaymaster,
            allowedPaymaster
        }
    }
}
