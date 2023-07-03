import type { Address, Hex, SendUserOperationResult } from "@alchemy/aa-core";
import { ValidatorProvider } from "./base";

export class ECDSAValidatorProvider extends ValidatorProvider {

    getEncodedEnableData = async (enableData: Address): Promise<Hex> => {
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }
        return await this.validator.encodeEnable(enableData);
    }

    getEncodedDisableData = async (enableData: Address): Promise<Hex> => {
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }
        return await this.validator.encodeDisable(enableData);
    }

    changeOwner = async (newOwner: Address): Promise<SendUserOperationResult> => {
        const encodedEnableData = await this.getEncodedEnableData(newOwner);
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }

        return await this.provider.sendUserOperation({ target: this.validator.validatorAddress, data: encodedEnableData });
    }

    deleteOwner = async (): Promise<SendUserOperationResult> => {
        const encodedDisableData = await this.getEncodedDisableData("0x");
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }

        return await this.provider.sendUserOperation({ target: this.validator.validatorAddress, data: encodedDisableData });
    }
}