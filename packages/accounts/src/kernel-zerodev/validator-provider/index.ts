import { ECDSAProvider } from "./ecdsa-provider.js";
import { SocialRecoveryProvider } from "./social-recovery-provider.js";
import { ERC165SessionKeyProvider } from "./erc165-session-key-provider.js";
import { KillSwitchProvider } from "./kill-switch-provider.js";
import type { ValidatorProviderMap } from "./types.js";

export const ValidatorProviders: ValidatorProviderMap = {
  ECDSA: ECDSAProvider,
  KILL_SWITCH: KillSwitchProvider,
  ERC165_SESSION_KEY: ERC165SessionKeyProvider,
  SOCIAL_RECOVERY: SocialRecoveryProvider,
};

export { ECDSAProvider, KillSwitchProvider, ERC165SessionKeyProvider, SocialRecoveryProvider };
