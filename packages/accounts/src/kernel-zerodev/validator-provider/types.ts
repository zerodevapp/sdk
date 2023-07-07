import type {
  SupportedValidators,
  ValidatorParamsMap,
} from "../validator/types.js";
import type { ValidatorProviderParams } from "./base.js";
import type { ECDSAProvider } from "./ecdsa-provider.js";

export type ValidatorProviderTypeMap = {
  ECDSA: ECDSAProvider;
};

export type ValidatorProviderParamsMap = {
  ECDSA: ValidatorProviderParams<ValidatorParamsMap["ECDSA"]>;
};

export type ValidatorProviderMap = {
  [V in SupportedValidators]: new (
    params: ValidatorProviderParamsMap[V]
  ) => ValidatorProviderTypeMap[V];
};
