import type {
  ECDSAValidator,
  ECDSAValidatorParams,
} from "./ecdsa-validator.js";
import type {
  MultiECDSAValidator,
  MultiECDSAValidatorParams,
} from "./multi-ecdsa-validator.js";

export type SupportedValidators = "ECDSA" | "MULTI_ECDSA";

export type ValidatorTypeMap = {
  ECDSA: ECDSAValidator;
  MULTI_ECDSA: MultiECDSAValidator;
};

export type ValidatorParamsMap = {
  ECDSA: ECDSAValidatorParams;
  MULTI_ECDSA: MultiECDSAValidatorParams;
};

export type ValidatorMap = {
  [V in SupportedValidators]: new (
    params: ValidatorParamsMap[V]
  ) => ValidatorTypeMap[V];
};
