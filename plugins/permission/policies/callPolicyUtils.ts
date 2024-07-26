import {
    type Abi,
    type AbiFunction,
    type Address,
    type GetAbiItemParameters,
    type Hex,
    encodeAbiParameters,
    getAbiItem,
    isHex,
    pad,
    toFunctionSelector,
    toHex
} from "viem"
import { CALL_POLICY_CONTRACT_V0_0_1 } from "../constants.js"
import {
    type CombinedArgs,
    type GeneratePermissionWithPolicyAddressParameters,
    ParamCondition,
    type ParamRule,
    type PermissionCore
} from "./types.js"

export function getPermissionFromABI<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
>({
    abi,
    args,
    functionName,
    policyAddress
}: GeneratePermissionWithPolicyAddressParameters<TAbi, TFunctionName>): Pick<
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
            .map((arg, i) => {
                if (!arg) return null
                if (policyAddress === CALL_POLICY_CONTRACT_V0_0_1) {
                    if (arg.condition === ParamCondition.ONE_OF) {
                        throw Error(
                            "The ONE_OF condition is only supported from CALL_POLICY_CONTRACT_V0_0_2 onwards. Please use CALL_POLICY_CONTRACT_V0_0_2 or a later version."
                        )
                    }
                    return {
                        params: pad(
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
                }
                let params: Hex[]
                if (arg.condition === ParamCondition.ONE_OF) {
                    params = arg.value.map((value) =>
                        pad(
                            isHex(value)
                                ? value
                                : toHex(value as Parameters<typeof toHex>[0]),
                            { size: 32 }
                        )
                    )
                } else {
                    params = [
                        pad(
                            isHex(arg.value)
                                ? arg.value
                                : toHex(
                                      arg.value as Parameters<typeof toHex>[0]
                                  ),
                            { size: 32 }
                        )
                    ]
                }
                return {
                    params,
                    offset: i * 32,
                    condition: arg.condition
                }
            })
            .filter((rule) => rule) as ParamRule[]
    }
    return {
        selector: functionSelector,
        rules: paramRules
    }
}

export const encodePermissionData = (
    permission: PermissionCore | PermissionCore[],
    policyAddress: Address
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
                        name: "params",
                        type:
                            policyAddress === CALL_POLICY_CONTRACT_V0_0_1
                                ? "bytes32"
                                : "bytes32[]"
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
