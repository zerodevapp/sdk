import type { AbiFunction } from "abitype"
import {
    type Abi,
    type GetAbiItemParameters,
    type Hex,
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
    PermissionCore
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
