import { TokenPaymaster } from "./token-paymaster";
import type { PaymasterMap } from "./types";
import { VerifyingPaymaster } from "./verifying-paymaster";

export const Paymasters: PaymasterMap = {
    VERIFYING_PAYMASTER: VerifyingPaymaster,
    TOKEN_PAYMASTER: TokenPaymaster
}