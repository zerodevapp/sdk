import { KernelAccountAbi } from "@zerodev/sdk"
import type { AbiFunction } from "abitype"
import type { ENTRYPOINT_ADDRESS_V06_TYPE } from "permissionless/types/entrypoint"
import {
    type Abi,
    type Address,
    type GetAbiItemParameters,
    type Hex,
    decodeFunctionData,
    encodeAbiParameters,
    getAbiItem,
    hexToSignature,
    isHex,
    pad,
    padHex,
    signatureToHex,
    toFunctionSelector,
    toHex,
    zeroAddress
} from "viem"
import { ParamOperator } from "./index.js"
import { Operation } from "./toSessionKeyValidatorPlugin.js"
import type {
    CombinedArgs,
    GeneratePermissionFromArgsParameters,
    ParamRules,
    PermissionCore,
    SessionKeyAccountParams,
    SessionKeyPlugin
} from "./types.js"

export function getPermissionFromABI<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
>({
    abi,
    args,
    functionName
}: GeneratePermissionFromArgsParameters<TAbi, TFunctionName>): Pick<
    PermissionCore,
    "sig" | "rules"
> {
    if (!abi || !functionName) {
        return {
            sig: undefined,
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
    let paramRules: ParamRules[] = []
    if (args && Array.isArray(args)) {
        paramRules = (args as CombinedArgs<AbiFunction["inputs"]>)
            .map(
                (arg, i) =>
                    arg && {
                        param: padHex(
                            isHex(arg.value)
                                ? arg.value
                                : toHex(
                                      arg.value as Parameters<typeof toHex>[0]
                                  ),
                            { size: 32 }
                        ),
                        offset: i * 32,
                        condition: arg.operator
                    }
            )
            .filter((rule) => rule) as ParamRules[]
    }
    return {
        sig: functionSelector,
        rules: paramRules
    }
}

export const fixSignedData = (sig: Hex): Hex => {
    let signature = sig
    if (!isHex(signature)) {
        signature = `0x${signature}`
        if (!isHex(signature)) {
            throw new Error(`Invalid signed data ${sig}`)
        }
    }

    let { r, s, v } = hexToSignature(signature)
    if (v === 0n || v === 1n) v += 27n
    const joined = signatureToHex({ r, s, v })
    return joined
}

export const encodePermissionData = (
    permission: PermissionCore | PermissionCore[],
    merkleProof?: string[] | string[][]
): Hex => {
    const permissionParam = {
        components: [
            {
                name: "index",
                type: "uint32"
            },
            {
                name: "target",
                type: "address"
            },
            {
                name: "sig",
                type: "bytes4"
            },
            {
                name: "valueLimit",
                type: "uint256"
            },
            {
                components: [
                    {
                        name: "offset",
                        type: "uint256"
                    },
                    {
                        internalType: "enum ParamCondition",
                        name: "condition",
                        type: "uint8"
                    },
                    {
                        name: "param",
                        type: "bytes32"
                    }
                ],
                name: "rules",
                type: "tuple[]"
            },
            {
                components: [
                    {
                        name: "interval",
                        type: "uint48"
                    },
                    {
                        name: "runs",
                        type: "uint48"
                    },
                    {
                        internalType: "ValidAfter",
                        name: "validAfter",
                        type: "uint48"
                    }
                ],
                name: "executionRule",
                type: "tuple"
            },
            {
                internalType: "enum Operation",
                name: "operation",
                type: "uint8"
            }
        ],
        name: "permission",
        type: Array.isArray(permission) ? "tuple[]" : "tuple"
    }
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    let params: any[]
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    let values: any[]
    if (merkleProof) {
        params = [
            permissionParam,
            {
                name: "merkleProof",
                type: Array.isArray(merkleProof[0])
                    ? "bytes32[][]"
                    : "bytes32[]"
            }
        ]
        values = [permission, merkleProof]
    } else {
        params = [permissionParam]
        values = [permission]
    }
    return encodeAbiParameters(params, values)
}

export function base64ToBytes(base64: string) {
    const binString = atob(base64)
    return Uint8Array.from(binString, (m) => m.codePointAt(0) as number)
}

export function bytesToBase64(bytes: Uint8Array) {
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("")
    return btoa(binString)
}

export function isSessionKeyValidatorPlugin<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE
>(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    plugin: any
): plugin is SessionKeyPlugin<entryPoint> {
    return plugin?.getPluginSerializationParams !== undefined
}
// We need to be able to serialize bigint to transmit session key over
// the network.
// Using this trick: https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-1006086291
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
;(BigInt.prototype as any).toJSON = function () {
    return this.toString()
}

export const serializeSessionKeyAccountParams = (
    params: SessionKeyAccountParams
) => {
    const jsonString = JSON.stringify(params)
    const uint8Array = new TextEncoder().encode(jsonString)
    const base64String = bytesToBase64(uint8Array)
    return base64String
}

export const deserializeSessionKeyAccountParams = (params: string) => {
    const uint8Array = base64ToBytes(params)
    const jsonString = new TextDecoder().decode(uint8Array)
    return JSON.parse(jsonString) as SessionKeyAccountParams
}

export const findMatchingPermissions = (
    callData: Hex,
    permissionsList?: PermissionCore[]
): PermissionCore | PermissionCore[] | undefined => {
    try {
        const { functionName, args } = decodeFunctionData({
            abi: KernelAccountAbi,
            data: callData
        })

        if (
            functionName !== "execute" &&
            functionName !== "executeBatch" &&
            functionName !== "executeDelegateCall"
        )
            return undefined
        if (functionName === "execute") {
            const [to, value, data] = args
            return filterPermissions(
                [to],
                [data],
                [value],
                permissionsList
            )?.[0]
        } else if (functionName === "executeDelegateCall") {
            const [to, data] = args
            return filterPermissions(
                [to],
                [data],
                [0n],
                permissionsList,
                Operation.DelegateCall
            )?.[0]
        } else if (functionName === "executeBatch") {
            const targets: Hex[] = []
            const values: bigint[] = []
            const dataArray: Hex[] = []
            for (const arg of args[0]) {
                targets.push(arg.to)
                values.push(arg.value)
                dataArray.push(arg.data)
            }
            return filterPermissions(
                targets,
                dataArray,
                values,
                permissionsList
            )
        }
        throw Error("Invalid function")
    } catch (error) {
        return undefined
    }
}

const filterPermissions = (
    targets: Address[],
    dataArray: Hex[],
    values: bigint[],
    permissionsList?: PermissionCore[],
    operation: Operation = Operation.Call
): PermissionCore[] | undefined => {
    if (
        targets.length !== dataArray.length ||
        targets.length !== values.length
    ) {
        throw Error("Invalid arguments")
    }
    const filteredPermissions = targets.map((target, index) => {
        if (!permissionsList || !permissionsList.length) return undefined

        const targetToMatch = target.toLowerCase()

        // Filter permissions by target
        const targetPermissions = permissionsList.filter(
            (permission) =>
                permission.target.toLowerCase() === targetToMatch ||
                permission.target.toLowerCase() === zeroAddress.toLowerCase()
        )

        if (!targetPermissions.length) return undefined

        const operationPermissions = filterByOperation(
            targetPermissions,
            // [TODO]: Check if we need to pass operation from userOp after Kernel v2.3 in
            operation
        )

        if (!operationPermissions.length) return undefined

        const signaturePermissions = filterBySignature(
            targetPermissions,
            dataArray[index].slice(0, 10).toLowerCase()
        )

        const valueLimitPermissions = signaturePermissions.filter(
            (permission) => (permission.valueLimit ?? 0n) >= values[index]
        )

        if (!valueLimitPermissions.length) return undefined

        const sortedPermissions = valueLimitPermissions.sort((a, b) => {
            if ((b.valueLimit ?? 0n) > (a.valueLimit ?? 0n)) {
                return 1
            } else if ((b.valueLimit ?? 0n) < (a.valueLimit ?? 0n)) {
                return -1
            } else {
                return 0
            }
        })

        return findPermissionByRule(sortedPermissions, dataArray[index])
    })
    return filteredPermissions.every((permission) => permission !== undefined)
        ? (filteredPermissions as PermissionCore[])
        : undefined
}

const filterByOperation = (
    permissions: PermissionCore[],
    operation: Operation
): PermissionCore[] => {
    return permissions.filter(
        (permission) =>
            permission.operation === operation || Operation.Call === operation
    )
}

const filterBySignature = (
    permissions: PermissionCore[],
    signature: string
): PermissionCore[] => {
    return permissions.filter(
        (permission) =>
            (permission.sig ?? pad("0x", { size: 4 })).toLowerCase() ===
            signature
    )
}

const findPermissionByRule = (
    permissions: PermissionCore[],
    data: string
): PermissionCore | undefined => {
    return permissions.find((permission) => {
        for (const rule of permission.rules ?? []) {
            const dataParam: Hex = getFormattedHex(
                `0x${data.slice(
                    10 + rule.offset * 2,
                    10 + rule.offset * 2 + 64
                )}`
            )
            const ruleParam: Hex = getFormattedHex(rule.param)

            if (!evaluateRuleCondition(dataParam, ruleParam, rule.condition)) {
                return false
            }
        }
        return true
    })
}

const getFormattedHex = (value: string): Hex => {
    return pad(isHex(value) ? value : toHex(value), {
        size: 32
    }).toLowerCase() as Hex
}

const evaluateRuleCondition = (
    dataParam: Hex,
    ruleParam: Hex,
    condition: ParamOperator
): boolean => {
    switch (condition) {
        case ParamOperator.EQUAL:
            return dataParam === ruleParam
        case ParamOperator.GREATER_THAN:
            return dataParam > ruleParam
        case ParamOperator.LESS_THAN:
            return dataParam < ruleParam
        case ParamOperator.GREATER_THAN_OR_EQUAL:
            return dataParam >= ruleParam
        case ParamOperator.LESS_THAN_OR_EQUAL:
            return dataParam <= ruleParam
        case ParamOperator.NOT_EQUAL:
            return dataParam !== ruleParam
        default:
            return false
    }
}
