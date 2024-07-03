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
    ONE_OF = 6
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

type ConditionValue<
    TAbiParameter extends AbiParameter,
    TAbiParameterKind extends AbiParameterKind
> =
    | {
          condition: ParamCondition.ONE_OF
          value: AbiParameterToPrimitiveType<TAbiParameter, TAbiParameterKind>[]
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
} & (TFunctionName extends string
    ? { abi: Narrow<TAbi> } & GetFunctionArgs<TAbi, TFunctionName>
    : _FunctionName extends string
      ? { abi: [Narrow<TAbi[number]>] } & GetFunctionArgs<TAbi, _FunctionName>
      : never)
