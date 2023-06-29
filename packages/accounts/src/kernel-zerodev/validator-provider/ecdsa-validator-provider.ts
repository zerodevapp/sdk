import type { Address, Hex, SendUserOperationResult } from "@alchemy/aa-core";
import { ValidatorProvider } from "./base";
import { ECDSAValidator } from "../validator/ecdsa-validator";


export class ECDSAValidatorProvider extends ValidatorProvider<ECDSAValidator> {

    getEncodedEnableData = async (enableData: Address): Promise<Hex> => {
        return await this.validator.encodeEnable(enableData);
    }

    getEncodedDisableData = async (enableData: Address): Promise<Hex> => {
        return await this.validator.encodeDisable(enableData);
    }

    changeOwner = async (newOwner: Address): Promise<SendUserOperationResult> => {
        const encodedEnableData = await this.getEncodedEnableData(newOwner);

        return await this.provider.sendUserOperation({ target: this.validator.validatorAddress, data: encodedEnableData });
    }

    deleteOwner = async (): Promise<SendUserOperationResult> => {
        const encodedDisableData = await this.getEncodedDisableData("0x");

        return await this.provider.sendUserOperation({ target: this.validator.validatorAddress, data: encodedDisableData });
    }
}