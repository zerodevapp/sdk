import type { Address } from "viem"

export const validatorAddresses: {
    [key: string]: Address
} = {
    "0.0.1": "0xBF997aC6751e3aC5Ed7c22e358A1D536680Bb8e3"
}

export const kernelVersionRangeToValidatorVersion: {
    [key: string]: string
} = {
    ">=0.3.0": "0.0.1"
}
