import type { SupportedValidators } from "../validator/types";
import type { ECDSAValidatorProvider, ECDSAValidatorProviderParams } from "./ecdsa-validator-provider";


export type ValidatorProviderTypeMap = {
    ECDSA: ECDSAValidatorProvider;
};

export type ValidatorProviderParamsMap = {
    ECDSA: ECDSAValidatorProviderParams;
};

export type ValidatorProviderMap = {
    [V in SupportedValidators]: (params: ValidatorProviderParamsMap[V]) => Promise<ValidatorProviderTypeMap[V]>
};