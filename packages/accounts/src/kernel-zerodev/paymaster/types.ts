import type { PaymasterConfig, PaymasterMiddlewareMap } from "../middleware/types";
import { TokenPaymasterDataMiddleware } from "./token-paymaster";
import { VerifyingPaymasterDataMiddleware } from "./verifying-paymaster";

export const middlewareClasses: PaymasterMiddlewareMap = {
    VERIFYING_PAYMASTER: VerifyingPaymasterDataMiddleware,
    TOKEN_PAYMASTER: TokenPaymasterDataMiddleware
};


export const defaultPaymasterConfig: PaymasterConfig<"VERIFYING_PAYMASTER"> = {
    policy: "VERIFYING_PAYMASTER",
    ...{}
};