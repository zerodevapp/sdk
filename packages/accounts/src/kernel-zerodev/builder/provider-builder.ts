import type { PromiseOrValue, SmartAccountSigner } from "@alchemy/aa-core";
import type { SupportedValidators, ValidatorParamsMap } from "../validator/types";
import { ZeroDevProvider, type ZeroDevProviderConfig } from "../provider";
import type { Transport } from "viem";
import { type KernelSmartAccountParams, KernelSmartContractAccount } from "../account";
import type { PaymasterConfig, PaymasterPolicy } from "../paymaster/types";
import type { MakeOptional } from "../types";
import { Validators } from "../validator";
import type { KernelBaseValidator } from "../validator/base";

export interface IProviderBuilder<V extends SupportedValidators> {
    // Setters
    setProjectId(projectId: string): this;
    setOwner(owner: SmartAccountSigner): this;
    setProvider(providerConfig: ZeroDevProviderConfig<KernelBaseValidator>): this;
    setPaymasterConfig(paymasterConfig: PaymasterConfig<PaymasterPolicy>): this;
    setAccount(accountConfig: KernelSmartAccountParams): this;
    setValidator(validatorConfig: MakeOptional<ValidatorParamsMap[SupportedValidators], "projectId" | "owner">, validatorType: V): this;

    // Getters
    getProjectId(): string;
    getOwner(): SmartAccountSigner;
    getProvider(): Promise<ZeroDevProvider>;
    getPaymasterConfig(): PaymasterConfig<PaymasterPolicy>;
    getAccount(): Promise<KernelSmartContractAccount>;
    getValidator(): Promise<KernelBaseValidator>;
}

export class ProviderBuilder<V extends SupportedValidators = "ECDSA"> implements IProviderBuilder<V> {
    provider?: PromiseOrValue<ZeroDevProvider>;
    account?: PromiseOrValue<KernelSmartContractAccount>;
    validator?: PromiseOrValue<KernelBaseValidator>;
    paymasterConfig: PaymasterConfig<PaymasterPolicy>;
    projectId?: string;
    owner?: SmartAccountSigner;
    validatorType?: V;

    constructor() {
        this.paymasterConfig = {
            policy: "VERIFYING_PAYMASTER"
        };
        this.validatorType = "ECDSA" as V;
        this.reset();
    }

    public reset(): void {
        this.provider = undefined;
        this.account = undefined;
        this.validator = undefined;
        this.projectId = undefined;
        this.owner = undefined;
        this.paymasterConfig = {
            policy: "VERIFYING_PAYMASTER"
        };
    }

    setProjectId(projectId: string): this {
        this.projectId = projectId;
        return this;
    }

    setOwner(owner: SmartAccountSigner): this {
        this.owner = owner;
        return this;
    }

    setProvider(providerConfig: MakeOptional<ZeroDevProviderConfig<KernelBaseValidator>, "projectId">): this {
        if (!this.getProjectId() && !providerConfig.projectId) {
            throw new Error("projectId not set");
        }
        this.provider = ZeroDevProvider.init({
            ...providerConfig,
            projectId: this.getProjectId() ?? providerConfig.projectId
        });
        return this;
    }

    setPaymasterConfig(paymasterConfig: PaymasterConfig<PaymasterPolicy>): this {
        this.paymasterConfig = paymasterConfig;
        return this;
    }

    setAccount(accountConfig: MakeOptional<KernelSmartAccountParams<KernelBaseValidator, Transport>, "owner" | "projectId">): this {
        if (!this.getProjectId() && !accountConfig.projectId) {
            throw new Error("projectId not set");
        }
        if (!this.getOwner() && !accountConfig.owner) {
            throw new Error("owner not set");
        }
        this.account = KernelSmartContractAccount.init({
            ...accountConfig,
            projectId: this.getProjectId() ?? accountConfig.projectId,
            owner: this.getOwner() ?? accountConfig.owner,
        });
        return this;
    }

    setValidator(validatorConfig: MakeOptional<ValidatorParamsMap[SupportedValidators], "projectId" | "owner">, validatorType: V = "ECDSA" as V): this {
        if (!this.getProjectId() && !validatorConfig.projectId) {
            throw new Error("projectId not set");
        }
        if (!this.getOwner() && !validatorConfig.owner) {
            throw new Error("owner not set");
        }
        if (!validatorType) {
            throw new Error("validatorType not set");
        }
        this.validatorType = validatorType;
        this.validator = Validators[validatorType]({
            ...validatorConfig,
            projectId: this.getProjectId() ?? validatorConfig.projectId,
            owner: this.getOwner() ?? validatorConfig.owner
        });
        return this;
    }

    getProjectId(): string {
        if (!this.projectId) {
            throw new Error("projectId not set");
        }
        return this.projectId;
    }

    getOwner(): SmartAccountSigner {
        if (!this.owner) {
            throw new Error("owner not set");
        }
        return this.owner;
    }

    async getProvider(): Promise<ZeroDevProvider> {
        if (!this.provider) {
            throw new Error("provider not set");
        }
        return await this.provider;
    }

    getPaymasterConfig(): PaymasterConfig<PaymasterPolicy> {
        return this.paymasterConfig;
    }

    async getAccount(): Promise<KernelSmartContractAccount> {
        if (!this.account) {
            throw new Error("account not set");
        }
        return await this.account;
    }

    async getValidator(): Promise<KernelBaseValidator> {
        if (!this.validator) {
            throw new Error("validator not set");
        }
        return await this.validator;
    }

    async prepareProvider(): Promise<void> {
        if (!this.provider || !this.account || !this.validator) {
            throw new Error("Required properties not set");
        }

        let [provider, account, validator] = await Promise.all([this.getProvider(), this.getAccount(), this.getValidator()]);

        this.account = account = account.connectValidator(validator);
        this.provider = provider = provider.connect(() => account).withZeroDevPaymasterAndData(this.paymasterConfig);
    }

    async buildProvider(): Promise<ZeroDevProvider> {
        if (!this.provider || !this.account || !this.validator) {
            throw new Error("Required properties not set");
        }

        let [provider, account, validator] = await Promise.all([this.getProvider(), this.getAccount(), this.getValidator()]);

        account = account.connectValidator(validator);
        provider = provider.connect(() => account).withZeroDevPaymasterAndData(this.paymasterConfig);

        this.reset();
        return provider;
    }

}