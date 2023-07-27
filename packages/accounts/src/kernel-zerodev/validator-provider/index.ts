import { ECDSAProvider } from "./ecdsa-provider.js";
import { OnOffProvider } from "./on-off-provider.js";
import type { ValidatorProviderMap } from "./types.js";

export const ValidatorProviders: ValidatorProviderMap = {
  ECDSA: ECDSAProvider,
  OnOff: OnOffProvider,
};

export { ECDSAProvider, OnOffProvider };
