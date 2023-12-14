import { ECDSAProvider } from "./ecdsa-provider.js";
import { ERC165SessionKeyProvider } from "./erc165-session-key-provider.js";
import { KillSwitchProvider } from "./kill-switch-provider.js";
import { RecoveryProvider } from "./recovery-provider.js";
import { SessionKeyProvider } from "./session-key-provider.js";
import { P256Provider } from "./p256-provider.js";
import type { ValidatorProviderMap } from "./types.js";

export const ValidatorProviders: ValidatorProviderMap = {
  ECDSA: ECDSAProvider,
  KILL_SWITCH: KillSwitchProvider,
  ERC165_SESSION_KEY: ERC165SessionKeyProvider,
  SESSION_KEY: SessionKeyProvider,
  RECOVERY: RecoveryProvider,
  P256: P256Provider,
};

export {
  ECDSAProvider,
  KillSwitchProvider,
  ERC165SessionKeyProvider,
  SessionKeyProvider,
  RecoveryProvider,
  P256Provider,
};
