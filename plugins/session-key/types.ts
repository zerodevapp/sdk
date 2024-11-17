import type { KernelValidator } from "@zerodev/sdk"
import type { Action, PluginValidityData } from "@zerodev/sdk/types"
import type {
    AbiFunction,
    AbiParameter,
    AbiParameterKind,
    AbiParameterToPrimitiveType,
    ExtractAbiFunction
} from "abitype"
import type { ExtractAbiFunctionNames } from "abitype"
import type { Abi, AbiStateMutability, Address, Hex, Narrow } from "viem"
import type { Operation, ParamOperator } from "./toSessionKeyValidatorPlugin.js"

/**
 * Taken from: https://github.com/wevm/abitype/blob/main/packages/abitype/src/types.ts
 * Combines members of an intersection into a readable type.
 *
 * @link https://twitter.com/mattpocockuk/status/1622730173446557697?s=20&t=NdpAcmEFXY01xkqU3KO0Mg
 * @example
 * type Result = Pretty<{ a: string } | { b: string } | { c: number, d: bigint }>
 * //   ^? type Result = { a: string; b: string; c: number; d: bigint }
 */
export type Pretty<type> = { [key in keyof type]: type[key] } & unknown

export type SessionNonces = {
    lastNonce: bigint
    invalidNonce: bigint
}
export type ExecutionRule = {
    validAfter: number // 48 bits
    interval: number // 48 bits
    runs: number // 48 bits
}
export interface ParamRules {
    offset: number
    condition: ParamOperator
    param: Hex
}

export type PermissionCore = {
    target: Address
    index?: number
    rules?: ParamRules[]
    sig?: Hex
    valueLimit?: bigint
    executionRule?: ExecutionRule
    operation?: Operation
}

export type Permission<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string,
    _FunctionName = TAbi extends Abi
        ? InferFunctionName<TAbi, TFunctionName>
        : never
> = PermissionCore & {
    functionName?: _FunctionName
} & (TFunctionName extends string
        ? { abi?: Narrow<TAbi> } & GetFunctionArgs<TAbi, TFunctionName>
        : _FunctionName extends string
          ? { abi?: [Narrow<TAbi[number]>] } & GetFunctionArgs<
                TAbi,
                _FunctionName
            >
          : never)

export interface SessionKeyData<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
> {
    validUntil?: number
    validAfter?: number
    paymaster?: Address
    permissions?: Permission<TAbi, TFunctionName>[]
}

export type ExportSessionKeyAccountParams = {
    initCode: Hex
    accountAddress: Address
}

export type SessionKeyAccountParams = {
    sessionKeyParams: SessionKeyData<Abi, string>
    action: Action
    validityData: PluginValidityData
    accountParams: ExportSessionKeyAccountParams
    enableSignature?: Hex
    privateKey?: Hex
}

export type SessionKeyPlugin = KernelValidator<"SessionKeyValidator"> & {
    getPluginSerializationParams(): SessionKeyData<Abi, string>
}

export type InferFunctionName<
    TAbi extends Abi | readonly unknown[] = Abi,
    TFunctionName extends string | undefined = string,
    TAbiStateMutability extends AbiStateMutability = AbiStateMutability
> = TAbi extends Abi
    ? ExtractAbiFunctionNames<
          TAbi,
          TAbiStateMutability
      > extends infer AbiFunctionNames
        ?
              | AbiFunctionNames
              | (TFunctionName extends AbiFunctionNames ? TFunctionName : never)
              | (Abi extends TAbi ? string : never)
        : never
    : TFunctionName

export type GetFunctionArgs<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string,
    TAbiFunction extends AbiFunction = TAbi extends Abi
        ? ExtractAbiFunction<TAbi, TFunctionName>
        : AbiFunction,
    TArgs = CombinedArgs<TAbiFunction["inputs"]>,
    FailedToParseArgs =
        | ([TArgs] extends [never] ? true : false)
        | (readonly unknown[] extends TArgs ? true : false)
> = true extends FailedToParseArgs
    ? {
          args?: readonly unknown[]
      }
    : TArgs extends readonly []
      ? { args?: never }
      : {
            args?: TArgs
        }

export type GeneratePermissionFromArgsParameters<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string,
    _FunctionName = TAbi extends Abi
        ? InferFunctionName<TAbi, TFunctionName>
        : never
> = {
    functionName?: _FunctionName
} & (TFunctionName extends string
    ? { abi: Narrow<TAbi> } & GetFunctionArgs<TAbi, TFunctionName>
    : _FunctionName extends string
      ? { abi: [Narrow<TAbi[number]>] } & GetFunctionArgs<TAbi, _FunctionName>
      : never)

export type AbiParametersToPrimitiveTypes<
    TAbiParameters extends readonly AbiParameter[],
    TAbiParameterKind extends AbiParameterKind = AbiParameterKind
> = Pretty<{
    [K in keyof TAbiParameters]: AbiParameterToPrimitiveType<
        TAbiParameters[K],
        TAbiParameterKind
    >
}>

export type AbiParametersToConditons<
    TAbiParameters extends readonly AbiParameter[]
> = Pretty<{
    [K in keyof TAbiParameters]: ParamOperator
}>

export type CombinedArgs<
    TAbiParameters extends readonly AbiParameter[],
    TAbiParameterKind extends AbiParameterKind = AbiParameterKind
> = {
    [K in keyof TAbiParameters]: {
        operator: ParamOperator
        value: AbiParameterToPrimitiveType<TAbiParameters[K], TAbiParameterKind>
    } | null
}
