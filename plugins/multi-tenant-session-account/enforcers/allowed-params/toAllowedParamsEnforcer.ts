import { type Abi, type Address, pad } from "viem"
import type { Caveat } from "../../types.js"
import { AllowedParamsEnforcerAddress, CallType } from "./constants.js"
import type { Permission } from "./types.js"
import { encodePermissionData, getPermissionFromABI } from "./utils.js"

export type AllowedParamsEnforcerParams<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
> = {
    permissions?: Permission<TAbi, TFunctionName>[]
    enforcerAddress?: Address
}

export function toAllowedParamsEnforcer<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
>({
    permissions,
    enforcerAddress = AllowedParamsEnforcerAddress
}: AllowedParamsEnforcerParams<TAbi, TFunctionName>): Caveat {
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
            rules: perm.rules ?? generatedPermissionParams?.[index]?.rules ?? []
        })) ?? []

    const encodedPermissionData = encodePermissionData(permissions)
    return {
        enforcer: enforcerAddress,
        terms: encodedPermissionData,
        args: "0x"
    }
}
