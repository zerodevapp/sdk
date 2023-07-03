import type { ValidatorProviderParams } from "./base";
import type { ECDSAValidatorProvider } from "./ecdsa-validator-provider";


export type ValidatorProviderTypeMap = {
    ECDSA: ECDSAValidatorProvider;
};

export type ValidatorProviderParamsMap = {
    ECDSA: ValidatorProviderParams;
};


