import type {
  ECDSAValidator,
  ECDSAValidatorParams,
} from "./ecdsa-validator.js";

import type {
  KillSwitchValidator,
  KillSwitchValidatorParams,
} from "./kill-switch-validator.js";

export type SupportedValidators = "ECDSA" | "KILL_SWITCH";

export type ValidatorTypeMap = {
  ECDSA: ECDSAValidator;
  KILL_SWITCH: KillSwitchValidator;
};

export type ValidatorParamsMap = {
  ECDSA: ECDSAValidatorParams;
  KILL_SWITCH: KillSwitchValidatorParams;
};

export type ValidatorMap = {
  [V in SupportedValidators]: new (
    params: ValidatorParamsMap[V]
  ) => ValidatorTypeMap[V];
};
