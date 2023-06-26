import { type ConnectedSmartAccountProvider } from "@alchemy/aa-core";
import type { ZeroDevProvider } from "../provider";
import { Paymasters } from "../paymaster";
import type { PaymasterConfig, PaymasterPolicy } from "../paymaster/types";


export const withZeroDevPaymasterAndData = (
    provider: ZeroDevProvider,
    paymasterConfig: PaymasterConfig<PaymasterPolicy>,
): ZeroDevProvider => {

    provider
        .withPaymasterMiddleware(zeroDevPaymasterAndDataMiddleware(provider, paymasterConfig));

    return provider;
}

export const zeroDevPaymasterAndDataMiddleware = <T extends PaymasterPolicy>(
    provider: ZeroDevProvider,
    paymasterConfig: PaymasterConfig<T>,
): Parameters<
    ConnectedSmartAccountProvider["withPaymasterMiddleware"]
>["0"] => {
    return {
        dummyPaymasterDataMiddleware: async (struct) => {
            struct.paymasterAndData = "0xfe7dbcab8aaee4eb67943c1e6be95b1d065985c6000000000000000000000000000000000000000000000000000001869aa31cf400000000000000000000000000000000000000000000000000000000000000007dfe2190f34af27b265bae608717cdc9368b471fc0c097ab7b4088f255b4961e57b039e7e571b15221081c5dce7bcb93459b27a3ab65d2f8a889f4a40b4022801b";
            return struct;
        },
        paymasterDataMiddleware: async (struct) => {
            const paymaster = new (Paymasters[paymasterConfig.policy])(provider, paymasterConfig);
            const paymasterResp = await paymaster.getPaymasterResponse(struct);
            if (paymasterResp === undefined) {
                return struct;
            }
            return {
                ...struct,
                ...paymasterResp
            }
        }
    }
}
