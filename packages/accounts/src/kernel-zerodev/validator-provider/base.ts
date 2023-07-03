import { defineReadOnly, type Hex } from "@alchemy/aa-core";
import { ZeroDevProvider, type ZeroDevProviderConfig } from "../provider";
import type { KernelBaseValidator } from "../validator/base";
import type { Hash } from "viem";

type DefinedAccount = Exclude<ZeroDevProviderConfig<KernelBaseValidator>["account"], undefined>;
export interface ValidatorProviderParams {
    provider: ZeroDevProvider;
}

// A simple facade abstraction for validator related provider operations
// Needs to be implemented for each validator plugin
export abstract class ValidatorProvider {

    provider: ZeroDevProvider;
    validator?: KernelBaseValidator;

    constructor(params: ValidatorProviderParams) {
        this.provider = params.provider;
        if (params.provider.account) {
            this.validator = (params.provider.account as DefinedAccount)?.validator;
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