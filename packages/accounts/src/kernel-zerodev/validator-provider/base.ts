import { type Hex, type SendUserOperationResult } from "@alchemy/aa-core";
import { ZeroDevProvider, type ZeroDevProviderConfig } from "../provider";
import type { KernelBaseValidator } from "../validator/base";

interface ValidatorProviderConfig extends ZeroDevProviderConfig {
    defaultValidator: KernelBaseValidator;
    validator?: KernelBaseValidator;
}


export class ValidatorProvider extends ZeroDevProvider {

    protected defaultValidator: KernelBaseValidator;
    protected validator: KernelBaseValidator;

    constructor(params: ValidatorProviderConfig) {
        super(params);
        this.defaultValidator = params.defaultValidator
        this.validator = params.validator ?? params.defaultValidator
    }

    sendEnableUserOp = async (enableData: Hex): Promise<SendUserOperationResult> => {
        const data = this.defaultValidator.encodeEnable(enableData);
        return await this.sendUserOperation({ target: this.defaultValidator.validatorAddress, data });
    }

    sendDisableUserOp = async (enableData: Hex): Promise<SendUserOperationResult> => {
        const data = this.defaultValidator.encodeEnable(enableData);
        return await this.sendUserOperation({ target: this.defaultValidator.validatorAddress, data });
    }

}