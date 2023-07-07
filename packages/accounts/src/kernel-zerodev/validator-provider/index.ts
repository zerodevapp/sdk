import { ECDSAProvider } from "./ecdsa-provider.js";
import type { ValidatorProviderMap } from "./types.js";

export const ValidatorProviders: ValidatorProviderMap = {
  ECDSA: ECDSAProvider,
};

export { ECDSAProvider };
