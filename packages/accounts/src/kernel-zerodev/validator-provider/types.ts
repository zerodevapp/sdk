import type { ECDSAValidatorParams } from "../validator/ecdsa-validator.js";
import type { MultiECDSAValidatorParams } from "../validator/multi-ecdsa-validator.js";
import type { SupportedValidators } from "../validator/types.js";
import type { ExtendedValidatorProviderParams } from "./base.js";
import type { ECDSAProvider } from "./ecdsa-provider.js";
import type { MultiECDSAProvider } from "./multi-ecdsa-provider.js";

export type ValidatorProviderTypeMap = {
  ECDSA: ECDSAProvider;
  MULTI_ECDSA: MultiECDSAProvider;
};

export type ValidatorProviderParamsMap = {
  ECDSA: ExtendedValidatorProviderParams<ECDSAValidatorParams>;
  MULTI_ECDSA: ExtendedValidatorProviderParams<MultiECDSAValidatorParams>;
};

export type ValidatorProviderMap = {
  [V in SupportedValidators]: new (
    params: ValidatorProviderParamsMap[V]
  ) => ValidatorProviderTypeMap[V];
};
