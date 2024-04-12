import type { EntryPoint } from "permissionless/types/entrypoint"
import { concatHex, encodeAbiParameters } from "viem"
import { PolicyFlags, SIGNATURE_POLICY_CONTRACT } from "../constants.js"
import type { Policy, SignaturePolicyParams } from "./types.js"

export async function toSignaturePolicy<entryPoint extends EntryPoint>({
    policyAddress = SIGNATURE_POLICY_CONTRACT,
    policyFlag = PolicyFlags.NOT_FOR_VALIDATE_USEROP,
    allowedRequestors
}: SignaturePolicyParams): Promise<Policy<entryPoint>> {
    return {
        getPolicyData: () => {
            return encodeAbiParameters(
                [{ name: "allowedSigners", type: "address[]" }],
                [allowedRequestors]
            )
        },
        getSignaturePolicyData: () => {
            return "0x"
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        },
        policyParams: {
            type: "signature",
            policyAddress,
            policyFlag,
            allowedRequestors
        } as SignaturePolicyParams & { type: "signature" }
    }
}
