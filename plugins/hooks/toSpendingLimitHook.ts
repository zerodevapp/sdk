import type { KernelValidatorHook } from "@zerodev/sdk"
import {
    type Address,
    concatHex,
    decodeAbiParameters,
    encodeAbiParameters,
    encodePacked,
    zeroAddress
} from "viem"
import { SPENDING_LIMIT_HOOK_V07 } from "./constants"

export type SpendingLimit = {
    token: Address
    allowance: bigint
}

export async function toSpendingLimitHook({
    limits,
    hookAddress
}: {
    limits: SpendingLimit[]
    hookAddress?: Address
}): Promise<KernelValidatorHook> {
    return {
        getIdentifier() {
            return hookAddress ?? SPENDING_LIMIT_HOOK_V07
        },
        async getEnableData() {
            const encodedLimits = limits.map((limit) => {
                const encodedToken = encodePacked(["address"], [limit.token])
                const encodedAllowance = encodePacked(
                    ["uint256"],
                    [limit.allowance]
                )

                return concatHex([encodedToken, encodedAllowance])
            })

            const encodedData = encodeAbiParameters(
                [{ name: "arr", type: "bytes[]" }],
                [encodedLimits]
            )

            return concatHex(["0xaa", encodedData])
        }
    }
}
