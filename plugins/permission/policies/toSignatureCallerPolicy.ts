import { type Address, concatHex, encodeAbiParameters } from "viem"
import { PolicyFlags } from "../constants.js"
import { SIGNATURE_POLICY_CONTRACT } from "../constants.js"
import type { Policy, PolicyParams } from "../types.js"

export type SignatureCallerPolicyParams = PolicyParams & {
    allowedCallers: Address[]
}

export function toSignatureCallerPolicy({
    policyAddress = SIGNATURE_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    allowedCallers
}: SignatureCallerPolicyParams): Policy {
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
            type: "signature-caller",
            policyAddress,
            policyFlag,
            allowedCallers
        } as SignatureCallerPolicyParams & { type: "signature-caller" }
    }
}
