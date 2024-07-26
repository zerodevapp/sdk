import type { Abi, Address } from "viem"
import { concatHex, pad } from "viem"
import {
    CALL_POLICY_CONTRACT_V0_0_1,
    CALL_POLICY_CONTRACT_V0_0_2,
    CALL_POLICY_CONTRACT_V0_0_3,
    CALL_POLICY_CONTRACT_V0_0_4,
    PolicyFlags
} from "../constants.js"
import type { Policy, PolicyParams } from "../types.js"
import {
    encodePermissionData,
    getPermissionFromABI
} from "./callPolicyUtils.js"
import { CallType, type Permission } from "./types.js"

export enum CallPolicyVersion {
    V0_0_1 = "0.0.1",
    V0_0_2 = "0.0.2",
    V0_0_3 = "0.0.3",
    V0_0_4 = "0.0.4"
}

export const getCallPolicyAddress = (
    policyVersion: CallPolicyVersion,
    policyAddress?: Address
): Address => {
    if (policyAddress) return policyAddress
    switch (policyVersion) {
        case CallPolicyVersion.V0_0_1:
            return CALL_POLICY_CONTRACT_V0_0_1
        case CallPolicyVersion.V0_0_2:
            return CALL_POLICY_CONTRACT_V0_0_2
        case CallPolicyVersion.V0_0_3:
            return CALL_POLICY_CONTRACT_V0_0_3
        case CallPolicyVersion.V0_0_4:
            return CALL_POLICY_CONTRACT_V0_0_4
    }
}

export type CallPolicyParams<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
> = PolicyParams & {
    policyVersion: CallPolicyVersion
    permissions?: Permission<TAbi, TFunctionName>[]
}

export function toCallPolicy<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
>({
    policyAddress,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    policyVersion,
    permissions = []
}: CallPolicyParams<TAbi, TFunctionName>): Policy {
    const callPolicyAddress = getCallPolicyAddress(policyVersion, policyAddress)

    const generatedPermissionParams = permissions?.map((perm) =>
        getPermissionFromABI({
            abi: perm.abi as Abi,
            functionName: perm.functionName as string,
            args: perm.args as [],
            policyAddress: callPolicyAddress
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

    const encodedPermissionData = encodePermissionData(
        permissions,
        callPolicyAddress
    )

    return {
        getPolicyData: () => {
            return encodedPermissionData
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, callPolicyAddress])
        },
        policyParams: {
            type: "call",
            policyVersion,
            policyAddress,
            policyFlag,
            permissions
        } as unknown as CallPolicyParams<Abi | readonly unknown[], string> & {
            type: "call"
        }
    }
}
