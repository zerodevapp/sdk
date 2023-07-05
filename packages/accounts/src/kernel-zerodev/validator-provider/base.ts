import { defineReadOnly, getChain, type Hex, type SendUserOperationResult, type SmartAccountSigner } from "@alchemy/aa-core";
import { ZeroDevProvider, type ZeroDevProviderConfig } from "../provider";
import type { KernelBaseValidator, KernelBaseValidatorParams } from "../validator/base";
import type { Hash } from "viem";
import type { PaymasterConfig, PaymasterPolicy } from "../paymaster/types";
import { KernelSmartContractAccount, type KernelSmartAccountParams, isKernelAccount } from "../account";
import { polygonMumbai } from "viem/chains";
import type { SupportedValidators } from "../validator/types";
import { Validators } from "../validator";

export type ValidatorProviderParamsOpts<P extends KernelBaseValidatorParams> = {
    paymasterConfig?: PaymasterConfig<PaymasterPolicy>;
    providerConfig?: Omit<ZeroDevProviderConfig, keyof ValidatorProviderParams<P>>;
    accountConfig?: Omit<KernelSmartAccountParams, keyof ValidatorProviderParams<P>>;
    validatorConfig?: Omit<P, keyof ValidatorProviderParams<P>>;
};

export interface ValidatorProviderParams<P extends KernelBaseValidatorParams> {
    projectId: string;
    owner: SmartAccountSigner;
    opts?: ValidatorProviderParamsOpts<P>;
}

// A simple facade abstraction for validator related provider operations
// Needs to be implemented for each validator plugin
export abstract class ValidatorProvider<P extends KernelBaseValidatorParams> {

    provider: ZeroDevProvider;
    validator?: KernelBaseValidator;

    constructor(params: ValidatorProviderParams<P>, validatorType: SupportedValidators = "ECDSA") {
        const chain = typeof params.opts?.providerConfig?.chain === "number" ?
            getChain(params.opts.providerConfig.chain) :
            (params.opts?.providerConfig?.chain ?? polygonMumbai);
        this.provider = new ZeroDevProvider({
            projectId: params.projectId,
            chain,
            rpcUrl: params.opts?.providerConfig?.rpcUrl,
            ...params.opts?.providerConfig
        });
        this.validator = new Validators[validatorType]({
            projectId: params.projectId,
            owner: params.owner,
            chain,
            ...params.opts?.validatorConfig
        });
        this.provider.connect(() =>
            new KernelSmartContractAccount({
                projectId: params.projectId,
                owner: params.owner,
                validator: this.validator,
                rpcClient: this.provider.rpcClient,
                ...params.opts?.accountConfig,
            })
        );
        if (params.opts?.paymasterConfig) {
            this.provider = this.provider.withZeroDevPaymasterAndData(params.opts.paymasterConfig);
        }
    }
    

    getEncodedEnableData = async (enableData: Hex): Promise<Hex> => {
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }
        return await this.validator.encodeEnable(enableData);
    };

    getEncodedDisableData = async (disableData: Hex): Promise<Hex> => {
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }
        return await this.validator.encodeDisable(disableData);
    };

    sendEnableUserOperation = async (enableData: Hex): Promise<SendUserOperationResult> => {
        const encodedEnableData = await this.getEncodedEnableData(enableData);
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }

        return await this.provider.sendUserOperation({ target: this.validator.validatorAddress, data: encodedEnableData });
    };

    sendDisableUserOperation = async (disableData: Hex): Promise<SendUserOperationResult> => {
        const encodedDisableData = await this.getEncodedDisableData(disableData);
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }

        return await this.provider.sendUserOperation({ target: this.validator.validatorAddress, data: encodedDisableData });
    };

    waitForUserOperationTransaction = async (hash: Hash): Promise<Hash> => {
        return await this.provider.waitForUserOperationTransaction(hash);
    };

    connectProvider = (
        provider: ZeroDevProvider
    ): this => {
        if (!isKernelAccount(this.provider.account)) {
            throw new Error(
                "ValidatorProvider: account is not set or not kernel, did you call `connect` first?"
            );
        }
        if (!this.provider.account.validator) {
            throw new Error(
                "ValidatorProvider: account is not set, did you call `connect` first?"
            );
        }
        defineReadOnly(this, "provider", provider);

        this.validator = this.provider.account.validator;

        return this;
    };

}