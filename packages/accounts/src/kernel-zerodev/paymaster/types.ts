import type { PaymasterConfig, PaymasterMiddlewareMap } from "../middleware/types";
import { TokenPaymasterDataMiddleware } from "./tokenPaymaster";
import { VerifyingPaymasterDataMiddleware } from "./verifyingPaymaster";

export const middlewareClasses: PaymasterMiddlewareMap = {
    VERIFYING_PAYMASTER: VerifyingPaymasterDataMiddleware,
    TOKEN_PAYMASTER: TokenPaymasterDataMiddleware
};


export const defaultPaymasterConfig: PaymasterConfig<"VERIFYING_PAYMASTER"> = {
    policy: "VERIFYING_PAYMASTER",
    ...{}
};