import type { SupportedValidators, ValidatorParamsMap } from "../validator/types";
import type { ValidatorProviderParams } from "./base";
import type { ECDSAProvider } from "./ecdsa-provider";


export type ValidatorProviderTypeMap = {
    ECDSA: ECDSAProvider;
};

export type ValidatorProviderParamsMap = {
    ECDSA: ValidatorProviderParams<ValidatorParamsMap["ECDSA"]>;
};

export type ValidatorProviderMap = {
    [V in SupportedValidators]: new (params: ValidatorProviderParamsMap[V]) => ValidatorProviderTypeMap[V]
};