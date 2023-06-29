import { defineReadOnly, type Hex } from "@alchemy/aa-core";
import { ZeroDevProvider, type ZeroDevProviderConfig } from "../provider";
import type { KernelBaseValidator } from "../validator/base";
import type { Hash } from "viem";

type DefinedAccount<VValidator extends KernelBaseValidator> = Exclude<ZeroDevProviderConfig<VValidator>["account"], undefined>;
export interface ValidatorProviderConfig {
    provider: ZeroDevProvider;
}

// A simple facade abstraction for validator related provider operations
// Needs to be implemented for each validator plugin
export abstract class ValidatorProvider<VValidator extends KernelBaseValidator = KernelBaseValidator> {

    provider: ZeroDevProvider;
    validator: VValidator;

    constructor(params: ValidatorProviderConfig) {
        this.provider = params.provider;
        if (!params.provider.account) {
            throw new Error("account not connected!");
        }
        this.validator = (params.provider.account as DefinedAccount<VValidator>).defaultValidator;
    }

    abstract getEncodedEnableData(enableData: Hex): Promise<Hex>;

    abstract getEncodedDisableData(enableData: Hex): Promise<Hex>;

    waitForUserOperationTransaction = async (hash: Hash): Promise<Hash> => {
        return await this.provider.waitForUserOperationTransaction(hash);
    }

    connectProvider = (
        provider: ZeroDevProvider<VValidator>,
        validator?: VValidator
    ): this => {
        if (!this.provider.isConnected()) {
            throw new Error(
                "ValidatorProvider: account is not set, did you call `connect` first?"
            );
        }
        defineReadOnly(this, "provider", provider);

        this.validator = validator ?? (this.provider.account as DefinedAccount<VValidator>).defaultValidator;
        
        return this;
    }

}