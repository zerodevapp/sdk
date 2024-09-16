import type { Policy } from "@zerodev/permissions"
import {
    CallPolicyVersion,
    type SignatureCallerPolicyParams,
    toCallPolicy,
    toGasPolicy,
    toRateLimitPolicy,
    toSignatureCallerPolicy,
    toSudoPolicy,
    toTimestampPolicy
} from "@zerodev/permissions/policies"
import type { Policy } from "@zerodev/permissions/types"
import type { Caveat } from "@zerodev/session-account"
import {
    CallType,
    ParamCondition,
    toAllowedParamsEnforcer
} from "@zerodev/session-account/enforcers"
import { type Address, type Hex, erc20Abi, toHex } from "viem"
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
            policies.push(
                toCallPolicy({
                    ...permission.data,
                    policyVersion: CallPolicyVersion.V0_0_4
                })
            )
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

export const getPermissionCaveat = (permission: Permission): Caveat[] => {
    const caveats: Caveat[] = []
    switch (permission.type) {
        case "sudo":
            break
        case "contract-call":
            caveats.push(
                toAllowedParamsEnforcer({
                    ...permission.data
                })
            )
            break
        case "erc20-token-approve": {
            const permissions = [
                {
                    abi: erc20Abi,
                    functionName: "approve",
                    target: permission.data.tokenAddress,
                    callType: CallType.BATCH_CALL,
                    args: [
                        {
                            condition: ParamCondition.ONE_OF,
                            value: permission.data.contractAllowList.map(
                                (list: { address: Address }) => list.address
                            )
                        },
                        {
                            condition: ParamCondition.LESS_THAN_OR_EQUAL,
                            value: BigInt(permission.data.allowance)
                        }
                    ]
                },
                ...permission.data.contractAllowList.flatMap(
                    (contract: { functions: Hex[]; address: Address }) =>
                        contract.functions.map((selector: Hex) => ({
                            target: contract.address,
                            selector,
                            callType: CallType.BATCH_CALL
                        }))
                )
            ]
            console.log({ permissions })
            caveats.push(
                toAllowedParamsEnforcer({
                    permissions
                })
            )
            break
        }
        default:
            break
    }

    return caveats
}
export const getCaveats = (
    permissionsParams: GrantPermissionsParams
): Caveat[] => {
    const caveats = permissionsParams.permissions.flatMap((permission) =>
        getPermissionCaveat(permission)
    )

    return caveats
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
