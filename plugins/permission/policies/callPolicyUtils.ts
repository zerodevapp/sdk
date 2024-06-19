import {
    type Abi,
    type AbiFunction,
    type GetAbiItemParameters,
    type Hex,
    encodeAbiParameters,
    getAbiItem,
    isHex,
    pad,
    toFunctionSelector,
    toHex
} from "viem"
import type {
    CombinedArgs,
    GeneratePermissionFromArgsParameters,
    ParamRule,
    Permission,
    PermissionCore
} from "./types.js"

export function toPermission<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
>(permission: Permission<TAbi, TFunctionName>) {
    return permission
}

export function getPermissionFromABI<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
>({
    abi,
    args,
    functionName
}: GeneratePermissionFromArgsParameters<TAbi, TFunctionName>): Pick<
    PermissionCore,
    "selector" | "rules"
> {
    if (!abi || !functionName) {
        return {
            selector: undefined,
            rules: undefined
        }
    }
    const abiItem = getAbiItem({
        abi,
        args,
        name: functionName
    } as GetAbiItemParameters)
    if (abiItem?.type !== "function") {
        throw Error(`${functionName} not found in abi`)
    }
    const functionSelector = toFunctionSelector(abiItem)
    let paramRules: ParamRule[] = []
    if (args && Array.isArray(args)) {
        paramRules = (args as CombinedArgs<AbiFunction["inputs"]>)
            .map(
                (arg, i) =>
                    arg && {
                        param: pad(
                            isHex(arg.value)
                                ? arg.value
                                : toHex(
                                      arg.value as Parameters<typeof toHex>[0]
                                  ),
                            { size: 32 }
                        ),
                        offset: i * 32,
                        condition: arg.condition
                    }
            )
            .filter((rule) => rule) as ParamRule[]
    }
    return {
        selector: functionSelector,
        rules: paramRules
    }
}

export const encodePermissionData = (
    permission: PermissionCore | PermissionCore[]
): Hex => {
    const permissionParam = {
        components: [
            {
                internalType: "enum CallType",
                name: "callType",
                type: "bytes1"
            },
            {
                name: "target",
                type: "address"
            },
            {
                name: "selector",
                type: "bytes4"
            },
            {
                name: "valueLimit",
                type: "uint256"
            },
            {
                components: [
                    {
                        internalType: "enum ParamCondition",
                        name: "condition",
                        type: "uint8"
                    },
                    {
                        name: "offset",
                        type: "uint64"
                    },

                    {
                        name: "param",
                        type: "bytes32"
                    }
                ],
                name: "rules",
                type: "tuple[]"
            }
        ],
        name: "permission",
        type: "tuple[]"
    }
    const params = [permissionParam]
    const values = [permission]

    return encodeAbiParameters(params, values)
}
