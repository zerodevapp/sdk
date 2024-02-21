import { type UserOperation } from "permissionless"
import type { Address, Hex } from "viem"
import { PolicyFlags } from "../constants.js"

export type PolicyParams = {
    policyAddress?: Address
    policyFlag?: PolicyFlags
}

export type Policy = {
    getPolicyData: () => Hex
    getSignaturePolicyData: (userOperation: UserOperation) => Hex
    getPolicyInfoInBytes: () => Hex
}
