import { type KernelValidator } from "@zerodev/sdk"
import type { EntryPoint } from "permissionless/types/entrypoint"
import type { Address, Hex, LocalAccount } from "viem"
import { PolicyFlags } from "./constants.js"

export type PermissionPlugin<entryPoint extends EntryPoint> = KernelValidator<
    entryPoint,
    "PermissionValidator",
    "PERMISSION"
> & {
    getPermissionId: () => Hex
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
}

export type PermissionPluginParams = {
    signer: ModularSigner
    policies: Policy[]
    entryPoint: EntryPoint
    flag?: PolicyFlags
}
