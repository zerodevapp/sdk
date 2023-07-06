import type { ECDSAValidator, ECDSAValidatorParams } from "./ecdsa-validator";

export type SupportedValidators = "ECDSA";

export type ValidatorTypeMap = {
    ECDSA: ECDSAValidator;
};

export type ValidatorParamsMap = {
    ECDSA: ECDSAValidatorParams;
};

export type ValidatorMap = {
    [V in SupportedValidators]: new (params: ValidatorParamsMap[V]) => ValidatorTypeMap[V]
};