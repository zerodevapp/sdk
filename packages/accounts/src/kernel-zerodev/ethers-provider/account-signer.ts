import {
  resolveProperties,
  type AccountMiddlewareFn,
  type FeeDataMiddleware,
  type GasEstimatorMiddleware,
  type PaymasterAndDataMiddleware,
  type PublicErc4337Client,
  type SignTypedDataParams,
} from "@alchemy/aa-core";
import {
  Signer,
  type TypedDataSigner,
  type TypedDataDomain,
  type TypedDataField,
} from "@ethersproject/abstract-signer";
import { hexlify } from "@ethersproject/bytes";
import { _TypedDataEncoder } from "@ethersproject/hash";
import type { Deferrable } from "@ethersproject/properties";
import {
  type TransactionRequest,
  type TransactionResponse,
} from "@ethersproject/providers";
import { ZeroDevEthersProvider } from "./ethers-provider.js";
import type { SupportedValidators } from "../validator/types.js";
import type { KernelSmartContractAccount } from "../account.js";

const hexlifyOptional = (value: any): `0x${string}` | undefined => {
  if (value == null) {
    return undefined;
  }

  return hexlify(value) as `0x${string}`;
};

export class ZeroDevAccountSigner<V extends SupportedValidators>
  extends Signer
  implements TypedDataSigner
{
  private account?: KernelSmartContractAccount;

  sendUserOperation;
  waitForUserOperationTransaction;

  constructor(readonly provider: ZeroDevEthersProvider<V>) {
    super();
    this.account = this.provider.accountProvider.getAccount();

    this.sendUserOperation =
      this.provider.accountProvider.sendUserOperation.bind(
        this.provider.accountProvider
      );
    this.waitForUserOperationTransaction =
      this.provider.accountProvider.waitForUserOperationTransaction.bind(
        this.provider.accountProvider
      );
  }

  getAddress(): Promise<string> {
    if (!this.account) {
      throw new Error(
        "connect the signer to a provider that has a connected account"
      );
    }

    return this.account.getAddress();
  }

  signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.account) {
      throw new Error(
        "connect the signer to a provider that has a connected account"
      );
    }

    return this.account.signMessage(message);
  }

  signTypedData(params: SignTypedDataParams): Promise<string> {
    if (!this.account) {
      throw new Error(
        "connect the signer to a provider that has a connected account"
      );
    }
    if (params.types) {
      delete params.types["EIP712Domain"];
    }

    return this.account.signTypedData(params);
  }

  _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    if (!this.account) {
      throw new Error(
        "connect the signer to a provider that has a connected account"
      );
    }
    const params = _TypedDataEncoder.getPayload(
      domain,
      types,
      value
    ) as SignTypedDataParams;
    if (params.types) {
      delete params.types["EIP712Domain"];
    }

    return this.signTypedData(params);
  }

  withPaymasterMiddleware = (overrides: {
    dummyPaymasterDataMiddleware?: PaymasterAndDataMiddleware;
    paymasterDataMiddleware?: PaymasterAndDataMiddleware;
  }): this => {
    this.provider.withPaymasterMiddleware(overrides);
    return this;
  };

  withGasEstimator = (override: GasEstimatorMiddleware): this => {
    this.provider.withGasEstimator(override);
    return this;
  };

  withFeeDataGetter = (override: FeeDataMiddleware): this => {
    this.provider.withFeeDataGetter(override);
    return this;
  };

  withCustomMiddleware = (override: AccountMiddlewareFn): this => {
    this.provider.withCustomMiddleware(override);
    return this;
  };

  async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    const resolved = await resolveProperties(transaction);
    const txHash = await this.provider.accountProvider.sendTransaction({
      // TODO: need to support gas fields as well
      from: (await this.getAddress()) as `0x${string}`,
      to: resolved.to as `0x${string}` | undefined,
      data: hexlifyOptional(resolved.data),
    });

    return this.provider.getTransaction(txHash);
  }

  signTransaction(
    _transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    throw new Error(
      "Transaction signing is not supported, use sendUserOperation instead"
    );
  }

  getPublicErc4337Client(): PublicErc4337Client {
    return this.provider.getPublicErc4337Client();
  }

  connect(provider: ZeroDevEthersProvider<V>): ZeroDevAccountSigner<V> {
    return new ZeroDevAccountSigner(provider);
  }
}
