import { ECDSAProvider } from "./ecdsa-provider.js";
import { MultiECDSAProvider } from "./multi-ecdsa-provider.js";
import type { ValidatorProviderMap } from "./types.js";

export const ValidatorProviders: ValidatorProviderMap = {
  ECDSA: ECDSAProvider,
  MULTI_ECDSA: MultiECDSAProvider
};

export { ECDSAProvider };
