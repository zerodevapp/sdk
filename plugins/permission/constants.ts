export const CALL_POLICY_CONTRACT = "0xc4a1aaED053Fc02717358a377A2d695bCdFA3B8A"
export const ECDSA_SIGNER_CONTRACT =
    "0x8Ed04D0B000777c87e701696cf6B9710733Df96a"
export const GAS_POLICY_CONTRACT = "0x50FD84A0A1D1683e1dafC5009876B38773fc8E3A"
export const SIGNATURE_POLICY_CONTRACT =
    "0x19a3E696fFdFEDfadb22297DB223B9ca501523dD"
export const SUDO_POLICY_CONTRACT = "0xe20Bc90E5d8b4276F073F8604b69AbE446Fb68d6"
export const RATE_LIMIT_POLICY_CONTRACT =
    "0xdB6e5F9a18f0F6Fa0861cB60f94Cf7f7374E8270"

export enum PolicyFlags {
    FOR_ALL_VALIDATION = "0x0000",
    NOT_FOR_VALIDATE_USEROP = "0x0001",
    NOT_FOR_VALIDATE_SIG = "0x0002"
}