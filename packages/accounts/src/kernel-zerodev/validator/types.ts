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
  SessionKeyValidator,
  SessionKeyValidatorParams,
} from "./session-key-validator.js";

export type SupportedValidators =
  | "ECDSA"
  | "KILL_SWITCH"
  | "ERC165_SESSION_KEY"
  | "SESSION_KEY";

export type ValidatorTypeMap = {
  ECDSA: ECDSAValidator;
  KILL_SWITCH: KillSwitchValidator;
  ERC165_SESSION_KEY: ERC165SessionKeyValidator;
  SESSION_KEY: SessionKeyValidator;
};

export type ValidatorParamsMap = {
  ECDSA: ECDSAValidatorParams;
  KILL_SWITCH: KillSwitchValidatorParams;
  ERC165_SESSION_KEY: ERC165SessionKeyValidatorParams;
  SESSION_KEY: SessionKeyValidatorParams;
};

export type ValidatorMap = {
  [V in SupportedValidators]: new (
    params: ValidatorParamsMap[V]
  ) => ValidatorTypeMap[V];
};
