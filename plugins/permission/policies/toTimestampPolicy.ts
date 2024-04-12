import { concatHex, encodeAbiParameters } from "viem"
import { PolicyFlags, TIMESTAMP_POLICY_CONTRACT } from "../constants.js"
import type { Policy, PolicyParams } from "../types.js"

export type TimestampPolicyParams = PolicyParams & {
    validAfter?: number
    validUntil?: number
}

export function toTimestampPolicy({
    policyAddress = TIMESTAMP_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    validAfter = 0,
    validUntil = 0
}: TimestampPolicyParams): Policy {
    return {
        getPolicyData: () => {
            return encodeAbiParameters(
                [
                    { name: "validAfter", type: "uint48" },
                    { name: "validUntil", type: "uint48" }
                ],
                [validAfter, validUntil]
            )
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        },
        policyParams: {
            type: "timestamp",
            policyAddress,
            policyFlag,
            validAfter,
            validUntil
        } as TimestampPolicyParams & { type: "timestamp" }
    }
}
