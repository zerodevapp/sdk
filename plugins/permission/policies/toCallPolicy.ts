import type { Abi, Address, Hex, Narrow } from "viem"
import { concatHex, pad } from "viem"
import {
    CALL_POLICY_CONTRACT_V0_0_1,
    CALL_POLICY_CONTRACT_V0_0_2,
    CALL_POLICY_CONTRACT_V0_0_3,
    CALL_POLICY_CONTRACT_V0_0_4,
    CALL_POLICY_CONTRACT_V0_0_5,
    PolicyFlags
} from "../constants.js"
import type { Policy, PolicyParams } from "../types.js"
import {
    encodePermissionData,
    getPermissionFromABI
} from "./callPolicyUtils.js"
import { CallType, type InferPermissions, type Permission } from "./types.js"

export enum CallPolicyVersion {
    V0_0_1 = "0.0.1",
    V0_0_2 = "0.0.2",
    V0_0_3 = "0.0.3",
    V0_0_4 = "0.0.4",
    V0_0_5 = "0.0.5"
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
        case CallPolicyVersion.V0_0_5:
            return CALL_POLICY_CONTRACT_V0_0_5
    }
}

export type CallPolicyParams<
    permissions extends readonly Permission<
        Abi,
        string
    >[] = readonly Permission<Abi, string>[]
> = PolicyParams & {
    policyVersion: CallPolicyVersion
    permissions?: InferPermissions<Narrow<permissions>>
}

export function toCallPolicy<
    const permissions extends readonly Permission<Abi, string>[]
>({
    policyAddress,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    policyVersion,
    permissions: inputPermissions
}: CallPolicyParams<permissions>): Policy {
    const callPolicyAddress = getCallPolicyAddress(policyVersion, policyAddress)

    const generatedPermissionParams = inputPermissions?.map((perm) => {
        // Natural discrimination: if abi and functionName are present, do ABI-based validation
        if (perm.abi && perm.functionName) {
            return getPermissionFromABI({
                abi: perm.abi as Abi,
                functionName: perm.functionName as string,
                args: perm.args,
                policyAddress: callPolicyAddress,
                selector: perm.selector
            })
        }

        // Otherwise, this is a manual permission - return empty to use manual selector/rules
        return {
            selector: undefined,
            rules: undefined
        }
    })

    const processedPermissions =
        inputPermissions?.map((perm, index) => ({
            ...perm,
            callType: perm.callType ?? CallType.CALL,
            selector:
                // Normalize selector to lowercase if it exists (hex values should be lowercase)
                (perm.selector
                    ? (perm.selector.toLowerCase() as Hex)
                    : perm.selector) ??
                generatedPermissionParams?.[index]?.selector ??
                pad("0x", { size: 4 }),
            valueLimit: perm.valueLimit ?? 0n,
            rules: perm.rules ?? generatedPermissionParams?.[index]?.rules ?? []
        })) ?? []

    const encodedPermissionData = encodePermissionData(
        processedPermissions,
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
            permissions: processedPermissions
        } as unknown as CallPolicyParams<permissions> & {
            type: "call"
        }
    }
}
