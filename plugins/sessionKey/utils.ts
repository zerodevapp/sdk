import type { AbiFunction } from "abitype"
import {
    type Abi,
    type GetAbiItemParameters,
    type Hex,
    encodeAbiParameters,
    getAbiItem,
    getFunctionSelector,
    hexToSignature,
    isHex,
    pad,
    signatureToHex,
    toHex
} from "viem"
import type {
    CombinedArgs,
    GeneratePermissionFromArgsParameters,
    ParamRules,
    PermissionCore,
    SessionKeyAccountParams,
    SessionKeyPlugin
} from "./types"

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
    const abiItem = getAbiItem({
        abi,
        args,
        name: functionName
    } as GetAbiItemParameters)
    if (abiItem.type !== "function") {
        throw Error(`${functionName} not found in abi`)
    }
    const functionSelector = getFunctionSelector(abiItem)
    let paramRules: ParamRules[] = []
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

export function isSessionKeyValidatorPlugin(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    plugin: any
): plugin is SessionKeyPlugin {
    return plugin?.exportSessionKeyParams !== undefined
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
