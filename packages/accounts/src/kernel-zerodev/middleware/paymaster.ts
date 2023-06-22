import type { ZeroDevProvider } from "../provider";
import { type ConnectedSmartAccountProvider } from "@alchemy/aa-core";
import { type PaymasterCommonConfig, type PaymasterConfig, type PaymasterPolicy } from "./types";
import { middlewareClasses } from "../paymaster/types";

export const withZeroDevPaymasterAndData = (
    provider: ZeroDevProvider,
    paymasterConfig: PaymasterConfig<PaymasterPolicy>,
    commonCfg: PaymasterCommonConfig
): ZeroDevProvider => {

    provider.withPaymasterMiddleware(zeroDevPaymasterAndDataMiddleware(paymasterConfig, commonCfg));

    return provider;
}


export const zeroDevPaymasterAndDataMiddleware = <T extends PaymasterPolicy>(
    paymasterConfig: PaymasterConfig<T>,
    commonCfg: PaymasterCommonConfig
): Parameters<
    ConnectedSmartAccountProvider["withPaymasterMiddleware"]
>["0"] => {

    return {
        dummyPaymasterDataMiddleware: async (struct) => {
            struct.paymasterAndData = "0xfe7dbcab8aaee4eb67943c1e6be95b1d065985c6000000000000000000000000000000000000000000000000000001869aa31cf400000000000000000000000000000000000000000000000000000000000000007dfe2190f34af27b265bae608717cdc9368b471fc0c097ab7b4088f255b4961e57b039e7e571b15221081c5dce7bcb93459b27a3ab65d2f8a889f4a40b4022801b";
            return struct;
        },
        paymasterDataMiddleware: async (struct) => {
            let MiddlewareClass = middlewareClasses[paymasterConfig.policy];
            let middleware = new MiddlewareClass(paymasterConfig, commonCfg);
            let erc20Struct;
            if (paymasterConfig.policy === "TOKEN_PAYMASTER") {
                erc20Struct = {
                    ...struct,
                    callData: struct.callData,
                    callGasLimit: struct.callGasLimit
                }
            }
            let paymasterResponse = await middleware.getPaymasterResponse(struct, erc20Struct);
            if (!paymasterResponse.paymasterAndData && paymasterConfig.policy !== "VERIFYING_PAYMASTER") {
                const VerifyingMiddlewareClass = middlewareClasses['VERIFYING_PAYMASTER'];
                const verifyingMiddleware = new VerifyingMiddlewareClass({ policy: 'VERIFYING_PAYMASTER' }, commonCfg);
                paymasterResponse = await verifyingMiddleware.getPaymasterResponse(struct);
            }
            return {
                ...struct,
                ...paymasterResponse,
                signature: ""
            };
        }
    }
};