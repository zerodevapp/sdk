import { type UserOperation } from "permissionless"
import type {
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import type { Address, Hex } from "viem"
import { PolicyFlags } from "../constants.js"

export type PolicyParams = {
    policyAddress?: Address
    policyFlag?: PolicyFlags
}

export type Policy<entryPoint extends EntryPoint> = {
    getPolicyData: () => Hex
    getSignaturePolicyData: (
        userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
    ) => Hex
    getPolicyInfoInBytes: () => Hex
}
