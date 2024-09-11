import type { OneOf } from "viem"

/** @internal */
export type GasLimitPolicy<uint256 = bigint> = {
    type: "gas-limit"
    data: {
        /** Gas limit (in wei). */
        limit: uint256
    }
}

/** @internal */
export type RateLimitPolicy = {
    type: "rate-limit"
    data: {
        /** Number of times during each interval. */
        count: number
        /** Interval (in seconds). */
        interval: number
    }
}

export type Policy<amount = bigint> = OneOf<
    GasLimitPolicy<amount> | RateLimitPolicy
>
