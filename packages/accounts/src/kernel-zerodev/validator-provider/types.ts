import type { ECDSAValidatorParams } from "../validator/ecdsa-validator.js";
import type { KillSwitchValidatorParams } from "../validator/kill-switch-validator.js";
import type { SupportedValidators } from "../validator/types.js";
import type { ExtendedValidatorProviderParams } from "./base.js";
import type { ECDSAProvider } from "./ecdsa-provider.js";
import type { KillSwitchProvider } from "./kill-switch-provider.js";

export type ValidatorProviderTypeMap = {
  ECDSA: ECDSAProvider;
  KILL_SWITCH: KillSwitchProvider;
};

export type ValidatorProviderParamsMap = {
  ECDSA: ExtendedValidatorProviderParams<ECDSAValidatorParams>;
  KILL_SWITCH: ExtendedValidatorProviderParams<KillSwitchValidatorParams>;
};

export type ValidatorProviderMap = {
  [V in SupportedValidators]: new (
    params: ValidatorProviderParamsMap[V]
  ) => ValidatorProviderTypeMap[V];
};
