import {
    type Abi,
    type AbiFunction,
    type Address,
    type Hex,
    encodeAbiParameters,
    isHex,
    keccak256,
    pad,
    size,
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
    policyAddress,
    selector
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

    // Check for function overloads
    const matchingFunctions = (abi as Abi).filter(
        (item) => item.type === "function" && item.name === functionName
    ) as AbiFunction[]

    let targetFunction: AbiFunction

    if (matchingFunctions.length > 1) {
        if (selector) {
            // Normalize selector to lowercase for comparison (selectors are hex values)
            const normalizedSelector = selector.toLowerCase()

            // If selector is provided, find the specific function overload
            const foundFunction = matchingFunctions.find((fn) => {
                const functionSelector = toFunctionSelector(fn)
                return functionSelector === normalizedSelector
            })

            if (!foundFunction) {
                throw new Error(
                    `No function found with selector "${selector}" for function "${functionName}".`
                )
            }

            targetFunction = foundFunction
        } else {
            // No selector provided for overloaded functions
            const functionSignatures = matchingFunctions
                .map((fn, index) => {
                    const inputs =
                        fn.inputs
                            ?.map((input) =>
                                input.name
                                    ? `${input.type} ${input.name}`
                                    : input.type
                            )
                            .join(", ") || ""
                    return `  ${index + 1}. ${functionName}(${inputs})`
                })
                .join("\n")

            throw new Error(
                `Multiple function overloads found for "${functionName}". Found ${matchingFunctions.length} functions with the same name but different signatures. To avoid ambiguity and potential security issues, please provide a "selector" field to specify which overload you want to use, or filter your ABI to include only the specific function overload you intend to use.

                Matching functions:
                ${functionSignatures}

                Solution: Either add a "selector" field with the specific function selector, or filter your ABI to include only the specific function signature you want to use.`
            )
        }
    } else if (matchingFunctions.length === 1) {
        // Single function found, use it directly
        targetFunction = matchingFunctions[0]
    } else {
        // No functions found with the given name
        throw new Error(`Function "${functionName}" not found in ABI`)
    }

    // Generate permission from the target function
    const functionSelector = toFunctionSelector(targetFunction)
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
                } else if (arg.condition === ParamCondition.SLICE_EQUAL) {
                    if (!("start" in arg) || !("length" in arg)) {
                        throw new Error(
                            "start and length are required for SLICE_EQUAL condition"
                        )
                    }
                    const functionArgsType = targetFunction.inputs[i].type
                    const { start, length, value } = arg

                    let hexValue: Hex

                    // functionArgsType can be "string" or "bytes"
                    if (functionArgsType === "string") {
                        hexValue = toHex(value as Parameters<typeof toHex>[0])
                    } else if (functionArgsType === "bytes") {
                        hexValue = isHex(value, { strict: true })
                            ? value
                            : toHex(value as Parameters<typeof toHex>[0])
                    } else {
                        throw new Error(
                            `Unsupported function argument type: ${functionArgsType} could be "string" or "bytes"`
                        )
                    }

                    if (size(hexValue) !== length) {
                        throw new Error(
                            "Value length is not equal to the given length"
                        )
                    }

                    params = [
                        toHex(start, { size: 32 }),
                        toHex(length, { size: 32 }),
                        keccak256(hexValue)
                    ]
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
