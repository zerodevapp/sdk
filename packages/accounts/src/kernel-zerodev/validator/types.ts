import type {
  ECDSAValidator,
  ECDSAValidatorParams,
} from "./ecdsa-validator.js";
import type {
  OnOffValidator,
  OnOffValidatorParams,
} from "./on-off-validator.js";

export type SupportedValidators = "ECDSA" | "OnOff";

export type ValidatorTypeMap = {
  ECDSA: ECDSAValidator;
  OnOff: OnOffValidator;
};

export type ValidatorParamsMap = {
  ECDSA: ECDSAValidatorParams;
  OnOff: OnOffValidatorParams;
};

export type ValidatorMap = {
  [V in SupportedValidators]: new (
    params: ValidatorParamsMap[V]
  ) => ValidatorTypeMap[V];
};
