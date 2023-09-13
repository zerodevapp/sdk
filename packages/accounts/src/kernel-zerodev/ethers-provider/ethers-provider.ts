import { getChainId } from "../api/index.js";
import {
  getChain,
  BaseSmartContractAccount,
  defineReadOnly,
  type AccountMiddlewareFn,
  type FeeDataMiddleware,
  type GasEstimatorMiddleware,
  type PaymasterAndDataMiddleware,
  type PublicErc4337Client,
} from "@alchemy/aa-core";
import { ZeroDevAccountSigner } from "./account-signer.js";
import { JsonRpcProvider } from "@ethersproject/providers";
import type { SupportedValidators } from "../validator/types.js";
import type {
  ValidatorProviderParamsMap,
  ValidatorProviderTypeMap,
} from "../validator-provider/types.js";
import { ValidatorProviders } from "../validator-provider/index.js";
import { withZeroDevPaymasterAndData } from "../middleware/paymaster.js";

export class ZeroDevEthersProvider<
  V extends SupportedValidators
> extends JsonRpcProvider {
  readonly accountProvider: ValidatorProviderTypeMap[V];
  constructor(validatorType: V, params: ValidatorProviderParamsMap[V]) {
    super();
    let bundlerProvider = params.bundlerProvider;
    const shouldUsePaymaster = params.usePaymaster === undefined || params.usePaymaster;
    if (params.opts?.paymasterConfig && params.opts?.paymasterConfig.policy === "TOKEN_PAYMASTER" && shouldUsePaymaster) {
        bundlerProvider = "STACKUP";
    }
    let accountProvider = new ValidatorProviders[validatorType]({...params, bundlerProvider});
    if (shouldUsePaymaster) {
      let paymasterConfig = params.opts?.paymasterConfig ?? {
        policy: "VERIFYING_PAYMASTER",
      };
      paymasterConfig = {
        ...paymasterConfig,
        paymasterProvider:
          params.opts?.paymasterConfig?.paymasterProvider ??
          bundlerProvider,
      };
      accountProvider = withZeroDevPaymasterAndData(
        accountProvider,
        paymasterConfig
      ) as ValidatorProviderTypeMap[V];
    }
    this.accountProvider = accountProvider;
  }

  public static async init<V extends SupportedValidators>(
    validatorType: V,
    params: ValidatorProviderParamsMap[V]
  ): Promise<ZeroDevEthersProvider<V>> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new ZeroDevEthersProvider(validatorType, {
      ...params,
      opts: {
        ...params.opts,
        providerConfig: {
          chain,
          ...params.opts?.providerConfig,
        },
      },
    });

    return instance;
  }

  getAccountProvider(): ValidatorProviderTypeMap[V] {
    return this.accountProvider;
  }

  /**
   * Rewrites the send method to use the account provider's EIP-1193
   * compliant request method
   *
   * @param method - the RPC method to call
   * @param params - the params required by the RPC method
   * @returns the result of the RPC call
   */
  send(method: string, params: any[]): Promise<any> {
    return this.accountProvider.request({ method, params });
  }

  /**
   * Connects the Provider to an Account and returns a Signer
   *
   * @param fn - a function that takes the account provider's rpcClient and returns a BaseSmartContractAccount
   * @returns an {@link ZeroDevAccountSigner} that can be used to sign and send user operations
   */
  connectToAccount(
    fn: (rpcClient: PublicErc4337Client) => BaseSmartContractAccount
  ): ZeroDevAccountSigner<V> {
    defineReadOnly(
      this,
      "accountProvider",
      this.accountProvider.connect(fn) as ValidatorProviderTypeMap[V]
    );
    return this.getAccountSigner();
  }

  /**
   * @returns an {@link ZeroDevAccountSigner} using this as the underlying provider
   */
  getAccountSigner(): ZeroDevAccountSigner<V> {
    return new ZeroDevAccountSigner(this);
  }

  withPaymasterMiddleware = (overrides: {
    dummyPaymasterDataMiddleware?: PaymasterAndDataMiddleware;
    paymasterDataMiddleware?: PaymasterAndDataMiddleware;
  }): this => {
    this.accountProvider.withPaymasterMiddleware(overrides);
    return this;
  };

  withGasEstimator = (override: GasEstimatorMiddleware): this => {
    this.accountProvider.withGasEstimator(override);
    return this;
  };

  withFeeDataGetter = (override: FeeDataMiddleware): this => {
    this.accountProvider.withFeeDataGetter(override);
    return this;
  };

  withCustomMiddleware = (override: AccountMiddlewareFn): this => {
    this.accountProvider.withCustomMiddleware(override);
    return this;
  };

  getPublicErc4337Client(): PublicErc4337Client {
    return this.accountProvider.rpcClient;
  }
}
