import type { SupportedValidators } from "../validator/types";
import type { ValidatorProvider } from "../validator-provider/base";
import { ValidatorProviders } from "../validator-provider";
import type { ValidatorProviderParamsMap, ValidatorProviderTypeMap } from "../validator-provider/types";
import { ProviderBuilder, type IProviderBuilder } from "./provider-builder";



export interface IValidatorProviderBuilder<V extends SupportedValidators> extends IProviderBuilder<V> {
    setValidatorProvider(validatorProviderConfig: ValidatorProviderParamsMap[V]): this;
    getValidatorProvider(): Promise<ValidatorProvider>;
}


export class ValidatorProviderBuilder<V extends SupportedValidators = "ECDSA"> extends ProviderBuilder<V> implements IValidatorProviderBuilder<V> {
    validatorProvider?: ValidatorProvider;

    constructor() {
        super();
        this.reset();
    }

    public reset(): void {
        super.reset();
        this.validatorProvider = undefined;
    }

    setValidatorProvider(validatorProviderConfig: ValidatorProviderParamsMap[V]): this {
        if (!this.validator || !this.validatorType) {
            throw new Error("validator not set");
        }
        const ProviderClass = ValidatorProviders[this.validatorType];
        this.validatorProvider = new ProviderClass(validatorProviderConfig) as ValidatorProviderTypeMap[SupportedValidators];
        return this;
    }

    async getValidatorProvider(): Promise<ValidatorProvider> {
        if (!this.validatorProvider) {
            throw new Error("validator provider not set");
        }
        return await this.validatorProvider;
    }

    async prepareValidatorProvider(): Promise<void> {
        if (!this.provider || !this.account || !this.validator || !this.validatorProvider) {
            throw new Error("Required properties not set");
        }

        let [provider, account, validator, validatorProvider] = await Promise.all([this.getProvider(), this.getAccount(), this.getValidator(), this.getValidatorProvider()]);

        this.account = account = account.connectValidator(validator);
        this.provider = provider = provider.connect(() => account).withZeroDevPaymasterAndData(this.paymasterConfig);
        // validatorProvider = validatorProvider.connectProvider(provider);
        this.validatorProvider = validatorProvider.connectProvider(provider) as ValidatorProviderTypeMap[SupportedValidators];
    }

    async buildValidatorProvider(): Promise<ValidatorProviderTypeMap[V]> {
        if (!this.provider || !this.account || !this.validator || !this.validatorProvider) {
            throw new Error("Required properties not set");
        }
        let [provider, account, validator, validatorProvider] = await Promise.all([this.getProvider(), this.getAccount(), this.getValidator(), this.getValidatorProvider()]);
        account = account.connectValidator(validator);
        provider = provider.connect(() => account).withZeroDevPaymasterAndData(this.paymasterConfig);
        
        let validatorProviderResult = validatorProvider.connectProvider(provider) as ValidatorProviderTypeMap["ECDSA"];

        this.reset();
        return validatorProviderResult;
    }

}