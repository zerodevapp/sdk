import { TokenPaymaster } from "./token-paymaster";
import type { PaymasterMap } from "./types";
import { VerifyingPaymaster } from "./verifying-paymaster";
import type { ZeroDevProvider } from "../provider";

export const Paymasters: PaymasterMap<ZeroDevProvider> = {
    VERIFYING_PAYMASTER: VerifyingPaymaster,
    TOKEN_PAYMASTER: TokenPaymaster
}