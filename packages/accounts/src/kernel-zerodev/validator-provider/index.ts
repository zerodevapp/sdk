import { ECDSAProvider } from "./ecdsa-provider.js";
import { KillSwitchProvider } from "./kill-switch-provider.js";
import type { ValidatorProviderMap } from "./types.js";

export const ValidatorProviders: ValidatorProviderMap = {
  ECDSA: ECDSAProvider,
  KILL_SWITCH: KillSwitchProvider,
};

export { ECDSAProvider, KillSwitchProvider };
