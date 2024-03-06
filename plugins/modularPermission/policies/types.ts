import { type UserOperation } from "permissionless"
import type { Abi, Address, Hex } from "viem"
import { PolicyFlags } from "../constants.js"
import { type Permission } from "../types.js"

export type PolicyParams = {
    policyAddress?: Address
    policyFlag?: PolicyFlags
}

export type SudoPolicyParams = PolicyParams & {
    type?: "sudo"
}

export type SignaturePolicyParams = PolicyParams & {
    type?: "signature"
    allowedRequestors: Address[]
}

export type MerklePolicyParams<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
> = PolicyParams & {
    type?: "merkle"
    permissions?: Permission<TAbi, TFunctionName>[]
}

export type GasPolicyParams = PolicyParams & {
    type?: "gas"
    maxGasAllowedInWei: bigint
    enforcePaymaster?: boolean
    paymasterAddress?: Address
}

export type Policy = {
    getPolicyData: () => Hex
    getSignaturePolicyData: (userOperation: UserOperation) => Hex
    getPolicyInfoInBytes: () => Hex
    // return params directly to serialize/deserialize Policy
    policyParams:
        | SudoPolicyParams
        | SignaturePolicyParams
        | MerklePolicyParams<Abi | readonly unknown[], string>
        | GasPolicyParams
}
