import { ValidatorProvider, type ValidatorProviderParams } from "./base";
import { type ECDSAValidatorParams } from "../validator/ecdsa-validator";


export class ECDSAProvider extends ValidatorProvider<ECDSAValidatorParams> {

    constructor(params: ValidatorProviderParams<ECDSAValidatorParams>) {
        super(params, "ECDSA");
    }

    changeOwner = this.sendEnableUserOperation;

    deleteOwner = this.sendDisableUserOperation;
}