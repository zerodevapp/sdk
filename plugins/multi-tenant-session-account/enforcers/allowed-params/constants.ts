export enum CallType {
    CALL = "0x00",
    BATCH_CALL = "0x01",
    DELEGATE_CALL = "0xff"
}

export enum ParamCondition {
    EQUAL = 0,
    GREATER_THAN = 1,
    LESS_THAN = 2,
    GREATER_THAN_OR_EQUAL = 3,
    LESS_THAN_OR_EQUAL = 4,
    NOT_EQUAL = 5,
    ONE_OF = 6
}

export const AllowedParamsEnforcerAddress =
    "0x54F1f6aAe77D2E3feA4c40A7d99E4aDcEFa00c79"
