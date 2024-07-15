import type { KernelValidator } from "@zerodev/sdk"
import type {
    Action,
    GetKernelVersion,
    PluginValidityData
} from "@zerodev/sdk/types"
import type { EntryPoint } from "permissionless/types/entrypoint"
import type { Abi, Address, Hex, LocalAccount } from "viem"
import type { PolicyFlags } from "./constants.js"
import type {
    CallPolicyParams,
    GasPolicyParams,
    RateLimitPolicyParams,
    SignatureCallerPolicyParams,
    SudoPolicyParams,
    TimestampPolicyParams
} from "./policies/index.js"

export type PermissionPlugin<entryPoint extends EntryPoint> = KernelValidator<
    entryPoint,
    "PermissionValidator"
> & {
    getPluginSerializationParams: () => PermissionData
}

export type ModularSignerParams = {
    signerContractAddress?: Address
}
export type PolicyParams = {
    policyAddress?: Address
    policyFlag?: PolicyFlags
}

export type ModularSigner = {
    account: LocalAccount
    signerContractAddress: Address
    getSignerData: () => Hex
    getDummySignature: () => Hex
}

export type Policy = {
    getPolicyData: () => Hex
    getPolicyInfoInBytes: () => Hex
    // return params directly to serialize/deserialize Policy
    policyParams:
        | (CallPolicyParams<Abi | readonly unknown[], string> & {
              type: "call"
          })
        | (GasPolicyParams & { type: "gas" })
        | (RateLimitPolicyParams & { type: "rate-limit" })
        | (SignatureCallerPolicyParams & { type: "signature-caller" })
        | (SudoPolicyParams & { type: "sudo" })
        | (TimestampPolicyParams & { type: "timestamp" })
}

export type PermissionPluginParams<entryPoint extends EntryPoint> = {
    signer: ModularSigner
    policies: Policy[]
    entryPoint: entryPoint
    kernelVersion: GetKernelVersion<entryPoint>
    flag?: PolicyFlags
}

export interface PermissionData {
    policies?: Policy[]
}

export type ExportPermissionAccountParams = {
    initCode: Hex
    accountAddress: Address
}

export type PermissionAccountParams = {
    permissionParams: PermissionData
    action: Action
    validityData: PluginValidityData
    accountParams: ExportPermissionAccountParams
    enableSignature?: Hex
    privateKey?: Hex
}
