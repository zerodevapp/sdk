import { defineReadOnly, getChain, type Hex, type SmartAccountSigner } from "@alchemy/aa-core";
import { ZeroDevProvider, type ZeroDevProviderConfig } from "../provider";
import type { KernelBaseValidator } from "../validator/base";
import type { Hash } from "viem";
import type { PaymasterConfig, PaymasterPolicy } from "../paymaster/types";
import { KernelSmartContractAccount, type KernelSmartAccountParams } from "../account";
import { polygonMumbai } from "viem/chains";

type DefinedAccount = Exclude<ZeroDevProviderConfig<KernelBaseValidator>["account"], undefined>;

export type ValidatorProviderParamsOpts = {
    paymasterConfig?: PaymasterConfig<PaymasterPolicy>;
    providerConfig?: Omit<ZeroDevProviderConfig<KernelBaseValidator>, keyof ValidatorProviderParams>;
    accountConfig?: Omit<KernelSmartAccountParams, keyof ValidatorProviderParams>;
};

export interface ValidatorProviderParams {
    projectId: string;
    owner: SmartAccountSigner;
    opts?: ValidatorProviderParamsOpts;
}

// A simple facade abstraction for validator related provider operations
// Needs to be implemented for each validator plugin
export abstract class ValidatorProvider {

    provider: ZeroDevProvider;
    validator?: KernelBaseValidator;

    constructor(params: ValidatorProviderParams) {
        const chain = typeof params.opts?.providerConfig?.chain === "number" ?
            getChain(params.opts.providerConfig.chain) :
            (params.opts?.providerConfig?.chain ?? polygonMumbai);
        this.provider = new ZeroDevProvider({
            projectId: params.projectId,
            chain,
            rpcUrl: params.opts?.providerConfig?.rpcUrl,
            ...params.opts?.providerConfig
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

    abstract getEncodedEnableData(enableData: Hex): Promise<Hex>;

    abstract getEncodedDisableData(enableData: Hex): Promise<Hex>;

    waitForUserOperationTransaction = async (hash: Hash): Promise<Hash> => {
        return await this.provider.waitForUserOperationTransaction(hash);
    };

    connectProvider = (
        provider: ZeroDevProvider<KernelBaseValidator>
    ): this => {
        if (!this.provider.isConnected()) {
            throw new Error(
                "ValidatorProvider: account is not set, did you call `connect` first?"
            );
        }
        if (!((this.provider.account as DefinedAccount).validator)) {
            throw new Error(
                "ValidatorProvider: account is not set, did you call `connect` first?"
            );
        }
        defineReadOnly(this, "provider", provider);

        this.validator = (this.provider.account as DefinedAccount).validator!;

        return this;
    };

}