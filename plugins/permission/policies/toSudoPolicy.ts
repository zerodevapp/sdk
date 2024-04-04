import { concatHex } from "viem"
import { PolicyFlags, SUDO_POLICY_CONTRACT } from "../constants.js"
import type { Policy, PolicyParams } from "../types.js"

export type SudoPolicyParams = PolicyParams & {
    type?: "sudo"
}

export function toSudoPolicy({
    policyAddress = SUDO_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    type = "sudo"
}: SudoPolicyParams): Policy {
    return {
        getPolicyData: () => {
            return "0x"
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        },
        policyParams: {
            type,
            policyAddress,
            policyFlag
        }
    }
}
