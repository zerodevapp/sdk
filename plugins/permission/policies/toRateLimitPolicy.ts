import { concatHex } from "viem"
import { PolicyFlags } from "../constants.js"
import {
    RATE_LIMIT_POLICY_CONTRACT,
    RATE_LIMIT_POLICY_WITH_RESET_CONTRACT
} from "../constants.js"
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
            if (policyAddress === RATE_LIMIT_POLICY_CONTRACT) {
                const intervalHex = interval.toString(16).padStart(12, "0")
                const countHex = count.toString(16).padStart(12, "0")
                const startAtHex = startAt.toString(16).padStart(12, "0")

                const data = intervalHex + countHex + startAtHex

                return `0x${data}`
            } else if (
                policyAddress === RATE_LIMIT_POLICY_WITH_RESET_CONTRACT
            ) {
                if (startAt !== 0 && startAt !== undefined) {
                    throw new Error(
                        "RATE_LIMIT_POLICY_WITH_RESET_CONTRACT does not support startAt"
                    )
                }
                const intervalHex = interval.toString(16).padStart(12, "0")
                const countHex = count.toString(16).padStart(12, "0")

                const data = intervalHex + countHex

                return `0x${data}`
            } else {
                throw new Error("Invalid policy address")
            }
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
