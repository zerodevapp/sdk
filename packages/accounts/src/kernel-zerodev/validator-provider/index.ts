import type { SupportedValidators } from "../validator/types";
import { ECDSAValidatorProvider } from "./ecdsa-validator-provider";
import type { ValidatorProviderParamsMap, ValidatorProviderTypeMap } from "./types";

export const ValidatorProviders: Record<SupportedValidators, new (params: ValidatorProviderParamsMap[SupportedValidators]) => ValidatorProviderTypeMap[SupportedValidators]> = {
    ECDSA: ECDSAValidatorProvider,
};

export { ECDSAValidatorProvider };
 