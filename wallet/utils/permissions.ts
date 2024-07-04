import {
    type RateLimitPolicyParams,
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
import type { GrantPermissionsParams, SessionType } from "../types"

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

export const getPolicies = (
    permissionsParams: GrantPermissionsParams
): Policy[] => {
    const policies = permissionsParams.permissions
        .map((permission) => {
            switch (permission.type) {
                case "sudo":
                    return toSudoPolicy({})
                case "contract-call":
                    return toCallPolicy(permission.data)
                case "rate-limit":
                    return toRateLimitPolicy(
                        permission.data as RateLimitPolicyParams
                    )
                case "gas-limit":
                    return toGasPolicy(permission.data)
                case "signature":
                    return toSignatureCallerPolicy(
                        permission.data as SignatureCallerPolicyParams
                    )
                default:
                    return undefined
            }
        })
        .concat([
            toTimestampPolicy({
                validAfter: Math.floor(new Date().valueOf() / 1000),
                validUntil: permissionsParams.expiry
            })
        ])

    return policies.filter((p) => p !== undefined) as Policy[]
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
