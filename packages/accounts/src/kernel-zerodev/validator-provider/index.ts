import { ECDSAProvider } from "./ecdsa-provider";
import type { ValidatorProviderMap } from "./types";

export const ValidatorProviders: ValidatorProviderMap = {
    ECDSA: ECDSAProvider,
};

export { ECDSAProvider };
 