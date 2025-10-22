import type { KernelValidator } from "@zerodev/sdk"
import type {
    Action,
    EntryPointType,
    GetKernelVersion,
    KERNEL_VERSION_TYPE,
    PluginValidityData
} from "@zerodev/sdk/types"
import type { Abi, Address, Hex, LocalAccount } from "viem"
import type { EntryPointVersion, UserOperation } from "viem/account-abstraction"
import type { SignAuthorizationReturnType } from "viem/accounts"
import type { PolicyFlags } from "./constants.js"
import type {
    CallPolicyParams,
    GasPolicyParams,
    RateLimitPolicyParams,
    SignatureCallerPolicyParams,
    SudoPolicyParams,
    TimestampPolicyParams
} from "./policies/index.js"

export type PermissionPlugin<
    TKernelVersion extends KERNEL_VERSION_TYPE = KERNEL_VERSION_TYPE
> = KernelValidator<"PermissionValidator"> & {
    getPluginSerializationParams: () => PermissionData
    kernelVersion: TKernelVersion
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
    getSignaturePolicyData: (userOperation?: UserOperation) => Hex
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

export type PermissionPluginParams<
    entryPointVersion extends EntryPointVersion
> = {
    signer: ModularSigner
    policies: Policy[]
    entryPoint: EntryPointType<entryPointVersion>
    kernelVersion: GetKernelVersion<entryPointVersion>
    flag?: PolicyFlags
    permissionId?: Hex
}

export interface PermissionData {
    policies?: Policy[]
    permissionId?: Hex
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
    eip7702Auth?: SignAuthorizationReturnType
    isPreInstalled?: boolean
}
