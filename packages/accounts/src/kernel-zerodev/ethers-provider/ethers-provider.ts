import { getChainId } from '../api/index.js';
import {
  SmartAccountProvider,
  getChain,
  type HttpTransport,
  BaseSmartContractAccount,
  defineReadOnly,
  type AccountMiddlewareFn,
  type FeeDataMiddleware,
  type GasEstimatorMiddleware,
  type PaymasterAndDataMiddleware,
  type PublicErc4337Client,
} from '@alchemy/aa-core';
import { AccountSigner } from '@alchemy/aa-ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import type { SupportedValidators } from '../validator/types.js';
import type { ValidatorProviderParamsMap } from '../validator-provider/types.js';
import { ValidatorProviders } from '../validator-provider/index.js';

export class ZeroDevEthersProvider<
  V extends SupportedValidators
> extends JsonRpcProvider {
  readonly accountProvider: SmartAccountProvider<HttpTransport>;
  constructor(validatorType: V, params: ValidatorProviderParamsMap[V]) {
    super();
    this.accountProvider = new ValidatorProviders[validatorType](params);
  }

  public static async init<V extends SupportedValidators>(
    validatorType: V,
    params: ValidatorProviderParamsMap[V]
  ): Promise<ZeroDevEthersProvider<V>> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error('ChainId not found');
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
   * @returns an {@link AccountSigner} that can be used to sign and send user operations
   */
  connectToAccount(
    fn: (rpcClient: PublicErc4337Client) => BaseSmartContractAccount
  ): AccountSigner {
    defineReadOnly(this, 'accountProvider', this.accountProvider.connect(fn));
    return this.getAccountSigner();
  }

  /**
   * @returns an {@link AccountSigner} using this as the underlying provider
   */
  getAccountSigner(): AccountSigner {
    return new AccountSigner(this);
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
