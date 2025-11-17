import type { ExtractAbiFunction, ExtractAbiFunctionNames } from "abitype"
import type {
    Abi,
    AbiFunction,
    AbiParameter,
    AbiParameterKind,
    AbiParameterToPrimitiveType,
    AbiStateMutability,
    Address,
    ContractFunctionName,
    Hex,
    Narrow,
    Prettify
} from "viem"

export enum CallType {
    CALL = "0x00",
    BATCH_CALL = "0x01",
    DELEGATE_CALL = "0xff"
}

export enum ParamCondition {
    EQUAL = 0,
    GREATER_THAN = 1,
    LESS_THAN = 2,
    GREATER_THAN_OR_EQUAL = 3,
    LESS_THAN_OR_EQUAL = 4,
    NOT_EQUAL = 5,
    ONE_OF = 6,
    SLICE_EQUAL = 7
}

export interface ParamRule {
    condition: ParamCondition
    offset: number
    params: Hex | Hex[]
}

export type PermissionCore = {
    callType?: CallType
    target: Address
    selector?: Hex
    valueLimit?: bigint
    rules?: ParamRule[]
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

export type PermissionWithABI<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string,
    _FunctionName = TAbi extends Abi
        ? InferFunctionName<TAbi, TFunctionName>
        : never
> = PermissionCore & {
    abi: TAbi extends Abi ? Narrow<TAbi> : [Narrow<TAbi[number]>]
    functionName: _FunctionName
    selector?: Hex
    rules?: never
} & (TFunctionName extends string
        ? GetFunctionArgs<TAbi, TFunctionName>
        : _FunctionName extends string
          ? GetFunctionArgs<TAbi, _FunctionName>
          : never)

export type PermissionManual = PermissionCore & {
    abi?: never
    functionName?: never
    args?: never
}

export type Permission<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
> = PermissionWithABI<TAbi, TFunctionName> | PermissionManual

type ConditionValue<
    TAbiParameter extends AbiParameter,
    TAbiParameterKind extends AbiParameterKind
> =
    | {
          condition: ParamCondition.ONE_OF
          value: AbiParameterToPrimitiveType<TAbiParameter, TAbiParameterKind>[]
      }
    | {
          condition: ParamCondition.SLICE_EQUAL
          value: AbiParameterToPrimitiveType<TAbiParameter, TAbiParameterKind>
          start: number
          length: number
      }
    | {
          condition: Exclude<ParamCondition, ParamCondition.ONE_OF>
          value: AbiParameterToPrimitiveType<TAbiParameter, TAbiParameterKind>
      }

export type CombinedArgs<
    TAbiParameters extends readonly AbiParameter[],
    TAbiParameterKind extends AbiParameterKind = AbiParameterKind
> = {
    [K in keyof TAbiParameters]: ConditionValue<
        TAbiParameters[K],
        TAbiParameterKind
    > | null
}

export type GeneratePermissionWithPolicyAddressParameters<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
> = GeneratePermissionFromArgsParameters<TAbi, TFunctionName> & {
    policyAddress: Address
}

export type GeneratePermissionFromArgsParameters<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string,
    _FunctionName = TAbi extends Abi
        ? InferFunctionName<TAbi, TFunctionName>
        : never
> = {
    functionName?: _FunctionName
    selector?: Hex
} & (TFunctionName extends string
    ? { abi: Narrow<TAbi> } & GetFunctionArgs<TAbi, TFunctionName>
    : _FunctionName extends string
      ? { abi: [Narrow<TAbi[number]>] } & GetFunctionArgs<TAbi, _FunctionName>
      : never)

// infer permission parameters from `unknown` - similar to GetMulticallContractParameters
export type GetPermissionParameters<permission> = permission extends {
    abi: infer abi extends Abi
} // 1. Check if `abi` is const-asserted or defined inline
    ? // 1a. Check if `functionName` is valid for `abi`
      permission extends {
          functionName: infer functionName extends ContractFunctionName<abi>
      }
        ? // Use PermissionWithABI which supports CombinedArgs
          PermissionWithABI<abi, functionName>
        : // 1b. `functionName` is invalid, check if `abi` is declared as `Abi`
          Abi extends abi
          ? PermissionWithABI<abi, string> // `abi` declared as `Abi`, unable to infer types further
          : // `abi` is const-asserted or defined inline, infer types for `functionName` and `args`
            PermissionWithABI<abi, string>
    : permission extends { target: Address } // manual permission
      ? PermissionManual
      : never // invalid permission

// Process permissions array - similar to MulticallContracts
export type InferPermissions<
    permissions extends readonly unknown[],
    result extends readonly unknown[] = []
> = permissions extends readonly [] // no permissions, return empty
    ? readonly []
    : permissions extends readonly [infer permission] // one permission left before returning `result`
      ? readonly [...result, Prettify<GetPermissionParameters<permission>>]
      : permissions extends readonly [infer permission, ...infer rest] // grab first permission and recurse through `rest`
        ? InferPermissions<
              [...rest],
              [...result, Prettify<GetPermissionParameters<permission>>]
          >
        : readonly unknown[] extends permissions
          ? permissions
          : // If `permissions` is *some* array but we couldn't assign `unknown[]` to it, then it must hold some known/homogenous type!
            permissions extends readonly (infer permission)[]
            ? readonly Prettify<GetPermissionParameters<permission>>[]
            : // Fallback
              readonly Permission<Abi, string>[]
