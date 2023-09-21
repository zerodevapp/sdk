import type { ECDSAValidatorParams } from "../validator/ecdsa-validator.js";
import type { ERC165SessionKeyValidatorParams } from "../validator/erc165-session-key-validator.js";
import type { KillSwitchValidatorParams } from "../validator/kill-switch-validator.js";
import type { SessionKeyValidatorParams } from "../validator/session-key-validator.js";
import type { SupportedValidators } from "../validator/types.js";
import type { ExtendedValidatorProviderParams } from "./base.js";
import type { ECDSAProvider } from "./ecdsa-provider.js";
import type { ERC165SessionKeyProvider } from "./erc165-session-key-provider.js";
import type { KillSwitchProvider } from "./kill-switch-provider.js";
import type {
  RecoveryProvider,
  RecoveryProviderParams,
} from "./recovery-provider.js";
import type {
  SessionKeyProvider,
  PrefillSessionData,
  SessionKeyProviderParams,
} from "./session-key-provider.js";

export type ValidatorProviderTypeMap = {
  ECDSA: ECDSAProvider;
  KILL_SWITCH: KillSwitchProvider;
  ERC165_SESSION_KEY: ERC165SessionKeyProvider;
  SESSION_KEY: SessionKeyProvider;
  RECOVERY: RecoveryProvider;
};

export type ValidatorProviderParamsMap = {
  ECDSA: ExtendedValidatorProviderParams<ECDSAValidatorParams>;
  KILL_SWITCH: ExtendedValidatorProviderParams<KillSwitchValidatorParams>;
  ERC165_SESSION_KEY: ExtendedValidatorProviderParams<ERC165SessionKeyValidatorParams>;
  SESSION_KEY: ExtendedValidatorProviderParams<SessionKeyValidatorParams>;
  RECOVERY: RecoveryProviderParams;
};

export type ValidatorProviderMap = {
  [V in SupportedValidators]: new (
    params: ValidatorProviderParamsMap[V]
  ) => ValidatorProviderTypeMap[V];
};

export type { PrefillSessionData, SessionKeyProviderParams };
