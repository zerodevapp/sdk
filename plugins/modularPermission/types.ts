import { type KernelValidator } from "@zerodev/sdk"
import { Policy } from "./policies/toGasPolicy.js"

export type ModularPermissionPlugin =
    KernelValidator<"ModularPermissionValidator"> & {}

export interface ModularPermissionData {
    validUntil?: number
    validAfter?: number
    policies: Policy[]
}

export type Nonces = {
    next: bigint
    revoked: bigint
}
