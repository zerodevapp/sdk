import { type KernelValidator } from "@zerodev/sdk"
import type { ExecutorData, PluginValidityData } from "@zerodev/sdk/types"
import type { EntryPoint } from "permissionless/types/entrypoint"
import type { Abi, Address, Hex, LocalAccount } from "viem"
import { PolicyFlags } from "./constants.js"
import type {
    CallPolicyParams,
    GasPolicyParams,
    RateLimitPolicyParams,
    SignatureCallerPolicyParams,
    SudoPolicyParams
} from "./policies/index.js"

export type PermissionPlugin<entryPoint extends EntryPoint> = KernelValidator<
    entryPoint,
    "PermissionValidator",
    "PERMISSION"
> & {
    getPermissionId: () => Hex
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
    getSignerData: (permissionId?: Hex) => Hex
    getDummySignature: () => Hex
}

export type Policy = {
    getPolicyData: (permissionId?: Hex) => Hex
    getPolicyInfoInBytes: () => Hex
    // return params directly to serialize/deserialize Policy
    policyParams:
        | CallPolicyParams<Abi | readonly unknown[], string>
        | GasPolicyParams
        | RateLimitPolicyParams
        | SignatureCallerPolicyParams
        | SudoPolicyParams
}

export type PermissionPluginParams = {
    signer: ModularSigner
    policies: Policy[]
    entryPoint: EntryPoint
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
    executorData: ExecutorData
    validityData: PluginValidityData
    accountParams: ExportPermissionAccountParams
    enableSignature?: Hex
    privateKey?: Hex
}
