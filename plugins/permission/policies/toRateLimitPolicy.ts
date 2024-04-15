import { concatHex } from "viem"
import { PolicyFlags } from "../constants.js"
import { RATE_LIMIT_POLICY_CONTRACT } from "../constants.js"
import type { Policy, PolicyParams } from "../types.js"

export type RateLimitPolicyParams = PolicyParams & {
    interval?: number
    count: number
    startAt?: number
}

export function toRateLimitPolicy({
    policyAddress = RATE_LIMIT_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    interval = 0,
    count,
    startAt = 0
}: RateLimitPolicyParams): Policy {
    return {
        getPolicyData: () => {
            const intervalHex = interval.toString(16).padStart(12, "0")
            const countHex = count.toString(16).padStart(12, "0")
            const startAtHex = startAt.toString(16).padStart(12, "0")

            const data = intervalHex + countHex + startAtHex

            return `0x${data}`
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        },
        policyParams: {
            type: "rate-limit",
            policyAddress,
            policyFlag,
            interval,
            count,
            startAt
        } as RateLimitPolicyParams & { type: "rate-limit" }
    }
}
