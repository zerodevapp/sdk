import { ECDSAValidatorProvider } from "./ecdsa-validator-provider";
import type { ValidatorProviderMap } from "./types";

export const ValidatorProviders: ValidatorProviderMap = {
    ECDSA: ECDSAValidatorProvider.init,
};

export { ECDSAValidatorProvider };
 