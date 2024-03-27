import { type Address, concatHex, encodeAbiParameters } from "viem"
import { PolicyFlags } from "../constants.js"
import { SIGNATURE_POLICY_CONTRACT } from "../constants.js"
import type { Policy, PolicyParams } from "../types.js"

export type SignaturePolicyParams = PolicyParams & {
    allowedCallers: Address[]
}

export async function toSignaturePolicy({
    policyAddress = SIGNATURE_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    allowedCallers
}: SignaturePolicyParams): Promise<Policy> {
    return {
        getPolicyData: () => {
            return encodeAbiParameters(
                [{ name: "allowedCallers", type: "address[]" }],
                [allowedCallers]
            )
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        }
    }
}
