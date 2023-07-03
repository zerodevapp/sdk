import { getChain, type SmartAccountSigner } from "@alchemy/aa-core";
import { getChainId } from "./api";
import { ValidatorProviderBuilder } from "./builder/validator-provider-builder";
import { createZeroDevPublicErc4337Client } from "./client/create-client";
import { BUNDLER_URL } from "./constants";
import type { SupportedValidators } from "./validator/types";
import type { PaymasterConfig, PaymasterPolicy } from "./paymaster/types";
import type { ZeroDevProviderConfig } from "./provider";
import type { KernelBaseValidator, KernelBaseValidatorParams } from "./validator/base";
import type { KernelSmartAccountParams } from "./account";
import type { ProviderBuilder } from "./builder/provider-builder";

export type KernelProviderOpts<V extends SupportedValidators> = {
    paymasterConfig?: PaymasterConfig<PaymasterPolicy>;
    providerConfig?: Omit<ZeroDevProviderConfig<KernelBaseValidator>, keyof KernelConfig<V>>;
    accountConfig?: Omit<KernelSmartAccountParams, keyof KernelConfig<V>>;
    validatorConfig?: Omit<KernelBaseValidatorParams, keyof KernelConfig<V>>;
};

export interface KernelConfig<V extends SupportedValidators> {
    projectId: string;
    owner: SmartAccountSigner;
    validatorType?: V;
    opts?: KernelProviderOpts<V>;
}

// A director class for the provider builder
export class KernelProvider<V extends SupportedValidators = "ECDSA"> {
    private providerBuilder: ProviderBuilder<V>;

    constructor(providerBuilder: ProviderBuilder<V>) {
        this.providerBuilder = providerBuilder;
    }

    public async init(params: KernelConfig<V>): Promise<void> {
        const chainId = await getChainId(params.projectId);
        if (!chainId) {
            throw new Error("ChainId not found");
        }
        const chain = getChain(chainId);
        const rpcClient = createZeroDevPublicErc4337Client({
            chain,
            rpcUrl: BUNDLER_URL,
            projectId: params.projectId
        });
        this.providerBuilder
            .setProjectId(params.projectId)
            .setOwner(params.owner)
            .setProvider({
                chain,
                ...params.opts?.providerConfig,
            }).setAccount({
                rpcClient,
                ...params.opts?.accountConfig
            }).setValidator({
                ...params.opts?.validatorConfig
            }, params.validatorType);

        if (params.opts?.paymasterConfig) {
            this.providerBuilder.setPaymasterConfig(params.opts.paymasterConfig);
        }
    }
}

// A director class for the validator provider builder
export class KernelValidatorProvider<V extends SupportedValidators> {
    private validatorProviderBuilder: ValidatorProviderBuilder<V>;

    constructor(validatorProviderBuilder: ValidatorProviderBuilder<V>) {

        this.validatorProviderBuilder = validatorProviderBuilder;
    }

    public async init(params: KernelConfig<V>): Promise<void> {
        const chainId = await getChainId(params.projectId);
        if (!chainId) {
            throw new Error("ChainId not found");
        }
        const chain = getChain(chainId);
        const rpcClient = createZeroDevPublicErc4337Client({
            chain,
            rpcUrl: BUNDLER_URL,
            projectId: params.projectId
        });
        this.validatorProviderBuilder
            .setProjectId(params.projectId)
            .setOwner(params.owner)
            .setProvider({
                chain,
                ...params.opts?.providerConfig,
            }).setAccount({
                rpcClient,
                ...params.opts?.accountConfig
            }).setValidator({
                ...params.opts?.validatorConfig
            }, params.validatorType)
            .setValidatorProvider(
                {
                    provider: await this.validatorProviderBuilder.getProvider(),
                }
            );

        if (params.opts?.paymasterConfig) {
            this.validatorProviderBuilder.setPaymasterConfig(params.opts.paymasterConfig);
        }
    }
}