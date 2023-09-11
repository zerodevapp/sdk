import { type ConnectedSmartAccountProvider } from "@alchemy/aa-core";
import type { ZeroDevProvider } from "../provider.js";
import { Paymasters } from "../paymaster/index.js";
import type { PaymasterConfig, PaymasterPolicy } from "../paymaster/types.js";

export const withZeroDevPaymasterAndData = <Provider extends ZeroDevProvider>(
  provider: Provider,
  paymasterConfig: PaymasterConfig<PaymasterPolicy>
): Provider => {
  provider.withPaymasterMiddleware(
    zeroDevPaymasterAndDataMiddleware(provider, paymasterConfig)
  );

  return provider;
};

export const zeroDevPaymasterAndDataMiddleware = <
  Provider extends ZeroDevProvider,
  P extends PaymasterPolicy
>(
  provider: Provider,
  paymasterConfig: PaymasterConfig<P>
): Parameters<
  ConnectedSmartAccountProvider["withPaymasterMiddleware"]
>["0"] => {
  return {
    dummyPaymasterDataMiddleware: async (struct) => {
      struct.paymasterAndData =
        "0xe93eca6595fe94091dc1af46aac2a8b5d79907700000000000000000000000000000000000000000000000000000000064ee5cd9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
      return struct;
    },
    paymasterDataMiddleware: async (struct) => {
      const preVerificationGas = BigInt("100000");
      const verificationGasLimit = BigInt("1000000");
      const callGasLimit = BigInt("55000");
      const paymaster = new Paymasters[paymasterConfig.policy](
        provider,
        paymasterConfig
      );
      const paymasterResp = await paymaster.getPaymasterResponse(
        {
          ...struct,
          preVerificationGas,
          verificationGasLimit,
          callGasLimit,
        },
        paymasterConfig.paymasterProvider
      );
      if (
        paymasterConfig.onlySendSponsoredTransaction &&
        (!paymasterResp ||
          !paymasterResp.paymasterAndData ||
          paymasterResp.paymasterAndData === "0x")
      ) {
        throw new Error("Transaction is not sponsored");
      }
      if (
        !paymasterResp ||
        !paymasterResp.paymasterAndData ||
        paymasterResp.paymasterAndData === "0x"
      ) {
        return {
          ...struct,
          paymasterAndData: "0x",
        };
      }
      return {
        ...struct,
        ...paymasterResp,
      };
    },
  };
};
