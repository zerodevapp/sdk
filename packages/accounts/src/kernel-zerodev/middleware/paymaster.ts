import { type ConnectedSmartAccountProvider } from "@alchemy/aa-core";
import type { ZeroDevProvider } from "../provider.js";
import { Paymasters } from "../paymaster/index.js";
import type { PaymasterConfig, PaymasterPolicy } from "../paymaster/types.js";


export const withZeroDevPaymasterAndData = <
Provider extends ZeroDevProvider
>(
    provider: Provider,
    paymasterConfig: PaymasterConfig<PaymasterPolicy>,
): Provider => {

    provider
        .withPaymasterMiddleware(zeroDevPaymasterAndDataMiddleware(provider, paymasterConfig));

    return provider;
}

export const zeroDevPaymasterAndDataMiddleware = <
Provider extends ZeroDevProvider,
P extends PaymasterPolicy
>(
    provider: Provider,
    paymasterConfig: PaymasterConfig<P>,
): Parameters<
    ConnectedSmartAccountProvider["withPaymasterMiddleware"]
>["0"] => {
    return {
        dummyPaymasterDataMiddleware: async (struct) => {
            struct.paymasterAndData = "0x";
            return struct;
        },
        paymasterDataMiddleware: async (struct) => {
            struct.preVerificationGas = (BigInt("100000"));
            struct.verificationGasLimit = (BigInt("1000000"));
            struct.callGasLimit = (BigInt("55000"));
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
