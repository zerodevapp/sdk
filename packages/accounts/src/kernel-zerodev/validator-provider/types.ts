import type { ECDSAValidatorParams } from "../validator/ecdsa-validator.js";
import type { ERC165SessionKeyValidatorParams } from "../validator/erc165-session-key-validator.js";
import type { KillSwitchValidatorParams } from "../validator/kill-switch-validator.js";
import type { SupportedValidators } from "../validator/types.js";
import type { ExtendedValidatorProviderParams } from "./base.js";
import type { ECDSAProvider } from "./ecdsa-provider.js";
import type { ERC165SessionKeyProvider } from "./erc165-session-key-provider.js";
import type { KillSwitchProvider } from "./kill-switch-provider.js";
import type { SocialRecoveryValidatorParams } from "../validator/social-recovery-validator.js";
import type { SocialRecoveryProvider } from "./social-recovery-provider.js";

export type ValidatorProviderTypeMap = {
  ECDSA: ECDSAProvider;
  KILL_SWITCH: KillSwitchProvider;
  ERC165_SESSION_KEY: ERC165SessionKeyProvider;
  SOCIAL_RECOVERY: SocialRecoveryProvider;
};

export type ValidatorProviderParamsMap = {
  ECDSA: ExtendedValidatorProviderParams<ECDSAValidatorParams>;
  KILL_SWITCH: ExtendedValidatorProviderParams<KillSwitchValidatorParams>;
  ERC165_SESSION_KEY: ExtendedValidatorProviderParams<ERC165SessionKeyValidatorParams>;
  SOCIAL_RECOVERY: ExtendedValidatorProviderParams<SocialRecoveryValidatorParams>;
};

export type ValidatorProviderMap = {
  [V in SupportedValidators]: new (
    params: ValidatorProviderParamsMap[V]
  ) => ValidatorProviderTypeMap[V];
};
