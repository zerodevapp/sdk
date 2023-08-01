import {
  type Hex,
  type SendUserOperationResult,
  type SmartAccountSigner,
} from "@alchemy/aa-core";
import { ZeroDevProvider, type ZeroDevProviderConfig } from "../provider.js";
import type {
  KernelBaseValidator,
  KernelBaseValidatorParams,
} from "../validator/base.js";
import type {
  PaymasterAndBundlerProviders,
  PaymasterConfig,
  PaymasterPolicy,
} from "../paymaster/types.js";
import {
  KernelSmartContractAccount,
  type KernelSmartAccountParams,
  isKernelAccount,
} from "../account.js";
import { polygonMumbai } from "viem/chains";
import { withZeroDevPaymasterAndData } from "../middleware/paymaster.js";
import type { RequiredProps } from "../types.js";

export type ValidatorProviderParamsOpts<P extends KernelBaseValidatorParams> = {
  paymasterConfig?: PaymasterConfig<PaymasterPolicy>;
  providerConfig?: Partial<ZeroDevProviderConfig>;
  accountConfig?: Omit<
    KernelSmartAccountParams,
    keyof ExtendedValidatorProviderParams<P>
  >;
  validatorConfig?: Omit<P, keyof ExtendedValidatorProviderParams<P>>;
};

export interface ValidatorProviderParams<P extends KernelBaseValidatorParams> {
  projectId: string;
  owner: SmartAccountSigner;
  bundlerProvider?: PaymasterAndBundlerProviders;
  opts?: ValidatorProviderParamsOpts<P>;
}

export type ExtendedValidatorProviderParams<
  P extends KernelBaseValidatorParams
> = ValidatorProviderParams<P> & RequiredProps<P>;

// A simple facade abstraction for validator related provider operations
// Needs to be implemented for each validator plugin
export abstract class ValidatorProvider<
  P extends KernelBaseValidatorParams
> extends ZeroDevProvider {
  constructor(
    params: ExtendedValidatorProviderParams<P>,
    validator: KernelBaseValidator
  ) {
    super({
      ...params.opts?.providerConfig,
      chain: params.opts?.providerConfig?.chain ?? polygonMumbai,
      rpcUrl: params.opts?.providerConfig?.rpcUrl,
      projectId: params.projectId,
      bundlerProvider: params.bundlerProvider,
    });
    this.connect(
      () =>
        new KernelSmartContractAccount({
          projectId: params.projectId,
          owner: params.owner,
          validator,
          rpcClient: this.rpcClient,
          bundlerProvider: params.bundlerProvider,
          ...params.opts?.accountConfig,
        })
    );
    if (params.opts?.paymasterConfig) {
      withZeroDevPaymasterAndData(this, params.opts.paymasterConfig);
    }
  }

  getValidator = (): KernelBaseValidator => {
    if (!isKernelAccount(this.account) || !this.account.validator) {
      throw new Error(
        "ValidatorProvider: account with validator is not set, did you call all connects first?"
      );
    }
    return this.account.getValidator();
  };

  getEncodedEnableData = async (enableData: Hex): Promise<Hex> => {
    if (!isKernelAccount(this.account) || !this.account.validator) {
      throw new Error(
        "ValidatorProvider: account with validator is not set, did you call all connects first?"
      );
    }
    return await this.account.validator.encodeEnable(enableData);
  };

  getEncodedDisableData = async (disableData: Hex): Promise<Hex> => {
    if (!isKernelAccount(this.account) || !this.account.validator) {
      throw new Error(
        "ValidatorProvider: account with validator is not set, did you call all connects first?"
      );
    }
    return await this.account.validator.encodeDisable(disableData);
  };

  sendEnableUserOperation = async (
    enableData: Hex
  ): Promise<SendUserOperationResult> => {
    const encodedEnableData = await this.getEncodedEnableData(enableData);
    if (!isKernelAccount(this.account) || !this.account.validator) {
      throw new Error(
        "ValidatorProvider: account with validator is not set, did you call all connects first?"
      );
    }

    return await this.sendUserOperation({
      target: this.account.validator.validatorAddress,
      data: encodedEnableData,
    });
  };

  sendDisableUserOperation = async (
    disableData: Hex
  ): Promise<SendUserOperationResult> => {
    const encodedDisableData = await this.getEncodedDisableData(disableData);
    if (!isKernelAccount(this.account) || !this.account.validator) {
      throw new Error(
        "ValidatorProvider: account with validator is not set, did you call all connects first?"
      );
    }

    return await this.sendUserOperation({
      target: this.account.validator.validatorAddress,
      data: encodedDisableData,
    });
  };
}
