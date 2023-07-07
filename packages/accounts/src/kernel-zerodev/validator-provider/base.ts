import {
  getChain,
  type Hex,
  type SendUserOperationResult,
  type SmartAccountSigner,
} from "@alchemy/aa-core";
import { ZeroDevProvider, type ZeroDevProviderConfig } from "../provider.js";
import type { KernelBaseValidatorParams } from "../validator/base.js";
import type { PaymasterConfig, PaymasterPolicy } from "../paymaster/types.js";
import {
  KernelSmartContractAccount,
  type KernelSmartAccountParams,
  isKernelAccount,
} from "../account.js";
import { polygonMumbai } from "viem/chains";
import type { SupportedValidators } from "../validator/types.js";
import { Validators } from "../validator/index.js";
import { withZeroDevPaymasterAndData } from "../middleware/paymaster.js";

export type ValidatorProviderParamsOpts<P extends KernelBaseValidatorParams> = {
  paymasterConfig?: PaymasterConfig<PaymasterPolicy>;
  providerConfig?: Omit<
    ZeroDevProviderConfig,
    keyof ValidatorProviderParams<P>
  >;
  accountConfig?: Omit<
    KernelSmartAccountParams,
    keyof ValidatorProviderParams<P>
  >;
  validatorConfig?: Omit<P, keyof ValidatorProviderParams<P>>;
};

export interface ValidatorProviderParams<P extends KernelBaseValidatorParams> {
  projectId: string;
  owner: SmartAccountSigner;
  opts?: ValidatorProviderParamsOpts<P>;
}

// A simple facade abstraction for validator related provider operations
// Needs to be implemented for each validator plugin
export abstract class ValidatorProvider<
  P extends KernelBaseValidatorParams
> extends ZeroDevProvider {
  constructor(
    params: ValidatorProviderParams<P>,
    validatorType: SupportedValidators = "ECDSA"
  ) {
    const chain =
      typeof params.opts?.providerConfig?.chain === "number"
        ? getChain(params.opts.providerConfig.chain)
        : params.opts?.providerConfig?.chain ?? polygonMumbai;
    super({
      ...params.opts?.providerConfig,
      rpcUrl: params.opts?.providerConfig?.rpcUrl,
      projectId: params.projectId,
      chain,
    });
    const validator = new Validators[validatorType]({
      projectId: params.projectId,
      owner: params.owner,
      chain,
      ...params.opts?.validatorConfig,
    });
    this.connect(
      () =>
        new KernelSmartContractAccount({
          projectId: params.projectId,
          owner: params.owner,
          validator,
          rpcClient: this.rpcClient,
          ...params.opts?.accountConfig,
        })
    );
    if (params.opts?.paymasterConfig) {
      withZeroDevPaymasterAndData(this, params.opts.paymasterConfig);
    }
  }

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
