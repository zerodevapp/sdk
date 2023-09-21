import { type Hex, type SendUserOperationResult } from "@alchemy/aa-core";
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
  bundlerProvider?: PaymasterAndBundlerProviders;
  opts?: ValidatorProviderParamsOpts<P>;
  usePaymaster?: boolean;
  defaultProvider?: ValidatorProvider<
    KernelBaseValidator,
    KernelBaseValidatorParams
  >;
}

export type ExtendedValidatorProviderParams<
  P extends KernelBaseValidatorParams
> = ValidatorProviderParams<P> & RequiredProps<P>;

// A simple facade abstraction for validator related provider operations
// Needs to be implemented for each validator plugin
export abstract class ValidatorProvider<
  V extends KernelBaseValidator,
  P extends KernelBaseValidatorParams
> extends ZeroDevProvider {
  protected defaultProvider?: ValidatorProvider<
    KernelBaseValidator,
    KernelBaseValidatorParams
  >;
  constructor(
    params: ExtendedValidatorProviderParams<P>,
    validator: KernelBaseValidator
  ) {
    let bundlerProvider = params.bundlerProvider;
    const shouldUsePaymaster =
      params.usePaymaster === undefined || params.usePaymaster;
    if (
      params.opts?.paymasterConfig &&
      params.opts?.paymasterConfig.policy === "TOKEN_PAYMASTER" &&
      shouldUsePaymaster
    ) {
      bundlerProvider = "STACKUP";
    }
    super({
      ...params.opts?.providerConfig,
      chain: params.opts?.providerConfig?.chain ?? polygonMumbai,
      rpcUrl: params.opts?.providerConfig?.rpcUrl,
      projectId: params.projectId,
      bundlerProvider,
    });
    this.defaultProvider = params.defaultProvider;
    this.connect(
      () =>
        new KernelSmartContractAccount({
          projectId: params.projectId,
          validator,
          defaultValidator: params.defaultProvider?.getValidator(),
          rpcClient: this.rpcClient,
          bundlerProvider,
          index: params.defaultProvider?.getAccount().getIndex(),
          ...params.opts?.accountConfig,
        })
    );
    if (shouldUsePaymaster) {
      let paymasterConfig = params.opts?.paymasterConfig ?? {
        policy: "VERIFYING_PAYMASTER",
      };
      paymasterConfig = {
        ...paymasterConfig,
        paymasterProvider:
          params.opts?.paymasterConfig?.paymasterProvider ?? bundlerProvider,
      };
      withZeroDevPaymasterAndData(this, paymasterConfig);
    }
  }

  getValidator = (): V => {
    if (!isKernelAccount(this.account) || !this.account.validator) {
      throw new Error(
        "ValidatorProvider: account with validator is not set, did you call all connects first?"
      );
    }
    return this.account.getValidator() as unknown as V;
  };

  getEncodedEnableData = async (enableData: Hex): Promise<Hex> => {
    if (!isKernelAccount(this.account) || !this.account.validator) {
      throw new Error(
        "ValidatorProvider: account with validator is not set, did you call all connects first?"
      );
    }
    return await this.account.validator.encodeEnable(enableData);
  };

  getEncodedDisableData = async (disableData: Hex = "0x"): Promise<Hex> => {
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
    disableData: Hex = "0x"
  ): Promise<SendUserOperationResult> => {
    const encodedDisableData = await this.getEncodedDisableData(disableData);
    if (!isKernelAccount(this.account) || !this.account.validator) {
      throw new Error(
        "ValidatorProvider: account with validator is not set, did you call all connects first?"
      );
    }
    if (!this.defaultProvider) {
      throw Error("Default Validator provider unintialized");
    }

    return await this.defaultProvider.sendUserOperation({
      target: this.account.validator.validatorAddress,
      data: encodedDisableData,
    });
  };
}
