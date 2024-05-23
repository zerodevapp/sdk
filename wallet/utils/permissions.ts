import { toCallPolicy, toTimestampPolicy } from "@zerodev/permissions/policies"
import type { Policy } from "@zerodev/permissions/types"
import type { IssuePermissionsParams, SessionType } from "../types"

export const validatePermissions = (
    permissionsParams: IssuePermissionsParams,
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
    permissionsParams: IssuePermissionsParams
): Policy[] => {
    const policies = permissionsParams.permissions
        .map((permission) => {
            if (permission.type === "call-contract") {
                return toCallPolicy(permission.data)
            }
            return undefined
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
    permission: SessionType | undefined
): boolean => {
    console.log("sessionId", sessionId)
    console.log("permission", permission)
    return false
}
