import type {
  ECDSAValidator,
  ECDSAValidatorParams,
} from "./ecdsa-validator.js";
import type {
  ERC165SessionKeyValidator,
  ERC165SessionKeyValidatorParams,
} from "./erc165-session-key-validator.js";

import type {
  SocialRecoveryValidator,
  SocialRecoveryValidatorParams,
} from "./social-recovery-validator.js";

import type {
  KillSwitchValidator,
  KillSwitchValidatorParams,
} from "./kill-switch-validator.js";

export type SupportedValidators =
  | "ECDSA"
  | "KILL_SWITCH"
  | "ERC165_SESSION_KEY"
  | "SOCIAL_RECOVERY";

export type ValidatorTypeMap = {
  ECDSA: ECDSAValidator;
  KILL_SWITCH: KillSwitchValidator;
  ERC165_SESSION_KEY: ERC165SessionKeyValidator;
  SOCIAL_RECOVERY: SocialRecoveryValidator;
};

export type ValidatorParamsMap = {
  ECDSA: ECDSAValidatorParams;
  KILL_SWITCH: KillSwitchValidatorParams;
  ERC165_SESSION_KEY: ERC165SessionKeyValidatorParams;
  SOCIAL_RECOVERY: SocialRecoveryValidatorParams;
};

export type ValidatorMap = {
  [V in SupportedValidators]: new (
    params: ValidatorParamsMap[V]
  ) => ValidatorTypeMap[V];
};
