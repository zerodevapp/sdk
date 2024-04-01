import type { Abi } from "viem"
import { concatHex, pad } from "viem"
import { PolicyFlags } from "../constants.js"
import { CALL_POLICY_CONTRACT } from "../constants.js"
import type { Policy, PolicyParams } from "../types.js"
import {
    encodePermissionData,
    getPermissionFromABI
} from "./callPolicyUtils.js"
import { CallType, type Permission } from "./types.js"

export type CallPolicyParams<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
> = PolicyParams & {
    permissions?: Permission<TAbi, TFunctionName>[]
}

export async function toCallPolicy<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
>({
    policyAddress = CALL_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    permissions = []
}: CallPolicyParams<TAbi, TFunctionName>): Promise<Policy> {
    const generatedPermissionParams = permissions?.map((perm) =>
        getPermissionFromABI({
            abi: perm.abi as Abi,
            functionName: perm.functionName as string,
            args: perm.args as []
        })
    )

    permissions =
        permissions?.map((perm, index) => ({
            ...perm,
            callType: perm.callType ?? CallType.CALL,
            selector:
                perm.selector ??
                generatedPermissionParams?.[index]?.selector ??
                pad("0x", { size: 4 }),
            valueLimit: perm.valueLimit ?? 0n,
            rules: perm.rules ?? generatedPermissionParams?.[index]?.rules ?? []
        })) ?? []

    const encodedPermissionData = encodePermissionData(permissions)

    return {
        getPolicyData: () => {
            return encodedPermissionData
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        }
    }
}
