import {
  type AbiParameter,
  type AbiParameterKind,
  type AbiParameterToPrimitiveType,
  type AbiFunction,
  type ExtractAbiFunction,
} from "abitype";
import { type Pretty } from "abitype/src/types.js";
import type {
  ECDSAValidator,
  ECDSAValidatorParams,
} from "./ecdsa-validator.js";
import type {
  ERC165SessionKeyValidator,
  ERC165SessionKeyValidatorParams,
} from "./erc165-session-key-validator.js";

import type {
  KillSwitchValidator,
  KillSwitchValidatorParams,
} from "./kill-switch-validator.js";
import type {
  RecoveryValidator,
  RecoveryValidatorParams,
} from "./recovery-validator.js";
import type {
  SessionKeyValidator,
  SessionKeyValidatorParams,
  ParamRules,
  Permission,
  SessionKeyData,
  SessionKeyParams,
  ParamOperator,
} from "./session-key-validator.js";
import type { P256Validator, P256ValidatorParams } from "./p256-validator.js";
import type { Abi, InferFunctionName, Narrow } from "viem";

export type SupportedValidators =
  | "ECDSA"
  | "KILL_SWITCH"
  | "ERC165_SESSION_KEY"
  | "SESSION_KEY"
  | "RECOVERY"
  | "P256";

export type ValidatorTypeMap = {
  ECDSA: ECDSAValidator;
  KILL_SWITCH: KillSwitchValidator;
  ERC165_SESSION_KEY: ERC165SessionKeyValidator;
  SESSION_KEY: SessionKeyValidator;
  RECOVERY: RecoveryValidator;
  P256: P256Validator;
};

export type ValidatorParamsMap = {
  ECDSA: ECDSAValidatorParams;
  KILL_SWITCH: KillSwitchValidatorParams;
  ERC165_SESSION_KEY: ERC165SessionKeyValidatorParams;
  SESSION_KEY: SessionKeyValidatorParams;
  RECOVERY: RecoveryValidatorParams;
  P256: P256ValidatorParams;
};

export type ValidatorMap = {
  [V in SupportedValidators]: new (
    params: ValidatorParamsMap[V]
  ) => ValidatorTypeMap[V];
};

export type EthereumProvider = { request(...args: any): Promise<any> };

export type { ParamRules, Permission, SessionKeyData, SessionKeyParams };

// Session Key types
export type AbiParametersToPrimitiveTypes<
  TAbiParameters extends readonly AbiParameter[],
  TAbiParameterKind extends AbiParameterKind = AbiParameterKind
> = Pretty<{
  [K in keyof TAbiParameters]: AbiParameterToPrimitiveType<
    TAbiParameters[K],
    TAbiParameterKind
  >;
}>;

export type AbiParametersToConditons<
  TAbiParameters extends readonly AbiParameter[]
> = Pretty<{
  [K in keyof TAbiParameters]: ParamOperator;
}>;

export type CombinedArgs<
  TAbiParameters extends readonly AbiParameter[],
  TAbiParameterKind extends AbiParameterKind = AbiParameterKind
> = {
  [K in keyof TAbiParameters]: {
    operator: ParamOperator;
    value: AbiParameterToPrimitiveType<TAbiParameters[K], TAbiParameterKind>;
  } | null;
};

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
      args?: readonly unknown[];
    }
  : TArgs extends readonly []
  ? { args?: never }
  : {
      args?: TArgs;
    };

export type GeneratePermissionFromArgsParameters<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string | undefined = string,
  _FunctionName = TAbi extends Abi
    ? InferFunctionName<TAbi, TFunctionName>
    : never
> = Pick<Permission, "target" | "valueLimit"> & {
  functionName?: _FunctionName;
} & (TFunctionName extends string
    ? { abi: Narrow<TAbi> } & GetFunctionArgs<TAbi, TFunctionName>
    : _FunctionName extends string
    ? { abi: [Narrow<TAbi[number]>] } & GetFunctionArgs<TAbi, _FunctionName>
    : never);
