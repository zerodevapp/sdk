import { concatHex } from "viem"
import { PolicyFlags, SUDO_POLICY_CONTRACT } from "../constants.js"
import type { Policy, SudoPolicyParams } from "./types.js"

export async function toSudoPolicy({
    policyAddress = SUDO_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    type = "sudo"
}: SudoPolicyParams): Promise<Policy> {
    return {
        getPolicyData: () => {
            return "0x"
        },
        getSignaturePolicyData: () => {
            return "0x"
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        },
        policyParams: {
            type,
            policyAddress,
            policyFlag
        } as SudoPolicyParams
    }
}
