import type { KernelValidator } from "@zerodev/sdk"
import type { Action, PluginValidityData } from "@zerodev/sdk/types"
import type { ExtractAbiFunction, ExtractAbiFunctionNames } from "abitype"
import type {
    Abi,
    AbiFunction,
    AbiParameter,
    AbiParameterKind,
    AbiParameterToPrimitiveType,
    AbiStateMutability,
    Address,
    Hex,
    Narrow
} from "viem"
import type { Operation, ParamOperator } from "./policies/toMerklePolicy.js"
import type { Policy } from "./policies/types.js"

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

export interface ModularPermissionData {
    validUntil?: number
    validAfter?: number
    policies?: Policy[]
}

export type ExportModularPermissionAccountParams = {
    initCode: Hex
    accountAddress: Address
}

export type ModularPermissionAccountParams = {
    modularPermissionParams: ModularPermissionData
    action: Action
    validityData: PluginValidityData
    accountParams: ExportModularPermissionAccountParams
    enableSignature?: Hex
    privateKey?: Hex
}

export type ModularPermissionPlugin =
    KernelValidator<"ModularPermissionValidator"> & {
        getPluginSerializationParams: () => ModularPermissionData
    }

export type Nonces = {
    lastNonce: bigint
    revoked: bigint
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
    rules?: ParamRules[]
    sig?: Hex
    valueLimit?: bigint
    operation?: Operation
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
