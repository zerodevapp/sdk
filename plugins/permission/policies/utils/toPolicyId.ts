import { type Hex, concat, encodeAbiParameters } from "viem"
import type { Policy } from "../../types.js"

export const toPolicyId = (policies: Policy[]): Hex => {
    return encodeAbiParameters(
        [{ name: "policiesData", type: "bytes[]" }],
        [
            policies.map((policy) =>
                concat([policy.getPolicyInfoInBytes(), policy.getPolicyData()])
            )
        ]
    )
}
