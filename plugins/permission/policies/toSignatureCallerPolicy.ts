import { type Address, concatHex, encodeAbiParameters } from "viem"
import { PolicyFlags } from "../constants.js"
import { SIGNATURE_POLICY_CONTRACT } from "../constants.js"
import type { Policy, PolicyParams } from "../types.js"

export type SignatureCallerPolicyParams = PolicyParams & {
    allowedCallers: Address[]
    type?: "signature-caller"
}

export async function toSignatureCallerPolicy({
    policyAddress = SIGNATURE_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    allowedCallers,
    type = "signature-caller"
}: SignatureCallerPolicyParams): Promise<Policy> {
    return {
        getPolicyData: () => {
            return encodeAbiParameters(
                [{ name: "allowedCallers", type: "address[]" }],
                [allowedCallers]
            )
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        },
        policyParams: {
            type,
            policyAddress,
            policyFlag,
            allowedCallers
        }
    }
}
