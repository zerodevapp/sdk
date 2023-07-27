import type { ECDSAValidatorParams } from "../validator/ecdsa-validator.js";
import type { OnOffValidatorParams } from "../validator/on-off-validator.js";
import type { SupportedValidators } from "../validator/types.js";
import type { ExtendedValidatorProviderParams } from "./base.js";
import type { ECDSAProvider } from "./ecdsa-provider.js";
import type { OnOffProvider } from "./on-off-provider.js";

export type ValidatorProviderTypeMap = {
  ECDSA: ECDSAProvider;
  OnOff: OnOffProvider;
};

export type ValidatorProviderParamsMap = {
  ECDSA: ExtendedValidatorProviderParams<ECDSAValidatorParams>;
  OnOff: ExtendedValidatorProviderParams<OnOffValidatorParams>;
};

export type ValidatorProviderMap = {
  [V in SupportedValidators]: new (
    params: ValidatorProviderParamsMap[V]
  ) => ValidatorProviderTypeMap[V];
};
