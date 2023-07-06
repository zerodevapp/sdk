import { TokenPaymaster } from "./token-paymaster.js";
import type { PaymasterMap } from "./types.js";
import { VerifyingPaymaster } from "./verifying-paymaster.js";
import type { ZeroDevProvider } from "../provider.js";

export const Paymasters: PaymasterMap<ZeroDevProvider> = {
    VERIFYING_PAYMASTER: VerifyingPaymaster,
    TOKEN_PAYMASTER: TokenPaymaster
}