import {
    type SignatureCallerPolicyParams,
    toCallPolicy,
    toGasPolicy,
    toRateLimitPolicy,
    toSignatureCallerPolicy,
    toSudoPolicy,
    toTimestampPolicy
} from "@zerodev/permissions/policies"
import type { Policy } from "@zerodev/permissions/types"
import { type Address, toHex } from "viem"
import type { GrantPermissionsParams, Permission, SessionType } from "../types"

export const validatePermissions = (
    permissionsParams: GrantPermissionsParams,
    supportedPolicies: string[]
) => {
    // check expiry
    if (permissionsParams.expiry < Math.floor(Date.now() / 1000)) {
        throw new Error(
            `Invalid expiry ${permissionsParams.expiry} for permissions`
        )
    }

    // check policies are supported
    for (const permission of permissionsParams.permissions) {
        if (!supportedPolicies.includes(permission.type)) {
            throw new Error(`Unsupported policy ${permission.type}`)
        }
    }
}

export const getPermissionPoliciy = (permission: Permission): Policy[] => {
    const policies: Policy[] = []
    switch (permission.type) {
        case "sudo":
            policies.push(toSudoPolicy({}))
            break
        case "contract-call":
            policies.push(toCallPolicy(permission.data))
            break
        case "signature":
            policies.push(
                toSignatureCallerPolicy(
                    permission.data as SignatureCallerPolicyParams
                )
            )
            break
        default:
            break
    }
    for (const policy of permission.policies) {
        switch (policy.type) {
            case "gas-limit":
                policies.push(
                    toGasPolicy({
                        allowed: policy.data.limit
                    })
                )
                break
            case "rate-limit":
                policies.push(toRateLimitPolicy(policy.data))
                break
            default:
                break
        }
    }
    return policies
}

export const getPolicies = (
    permissionsParams: GrantPermissionsParams
): Policy[] => {
    const policies = permissionsParams.permissions
        .flatMap((permission) => getPermissionPoliciy(permission))
        .concat([
            toTimestampPolicy({
                validAfter: Math.floor(new Date().valueOf() / 1000),
                validUntil: permissionsParams.expiry
            })
        ])
    return policies
}

export const isSessionValid = (
    sessionId: `0x${string}` | undefined,
    permission: SessionType | undefined,
    address: Address,
    chainId: number
): boolean => {
    if (!sessionId || !permission) return false

    const selectedPermission = permission[address]?.[toHex(chainId)]
    if (!selectedPermission) return false

    return !!selectedPermission.find((p) => p.sessionId === sessionId)
}
