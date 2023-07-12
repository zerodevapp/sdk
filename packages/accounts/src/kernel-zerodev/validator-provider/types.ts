import type { ECDSAValidatorParams } from "../validator/ecdsa-validator.js";
import type { SupportedValidators } from "../validator/types.js";
import type { ExtendedValidatorProviderParams } from "./base.js";
import type { ECDSAProvider } from "./ecdsa-provider.js";

export type ValidatorProviderTypeMap = {
  ECDSA: ECDSAProvider;
};

export type ValidatorProviderParamsMap = {
  ECDSA: ExtendedValidatorProviderParams<ECDSAValidatorParams>;
};

export type ValidatorProviderMap = {
  [V in SupportedValidators]: new (
    params: ValidatorProviderParamsMap[V]
  ) => ValidatorProviderTypeMap[V];
};
