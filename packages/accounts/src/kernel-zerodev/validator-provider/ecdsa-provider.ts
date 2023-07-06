import { ValidatorProvider, type ValidatorProviderParams } from "./base.js";
import { type ECDSAValidatorParams } from "../validator/ecdsa-validator.js";
import { getChain } from "@alchemy/aa-core";
import { getChainId } from "../api/index.js";


export class ECDSAProvider extends ValidatorProvider<ECDSAValidatorParams> {

    constructor(params: ValidatorProviderParams<ECDSAValidatorParams>) {
        super(params, "ECDSA");
    }

    public static async init(params: ValidatorProviderParams<ECDSAValidatorParams>): Promise<ECDSAProvider> {
        const chainId = await getChainId(params.projectId);
        if (!chainId) {
            throw new Error("ChainId not found");
        }
        const chain = getChain(chainId);
        const instance = new ECDSAProvider({
            ...params,
            opts: {
                ...params.opts,
                providerConfig: {
                    chain,
                    ...params.opts?.providerConfig
                }
            }
        });
        return instance;
    }

    changeOwner = this.sendEnableUserOperation;

    deleteOwner = this.sendDisableUserOperation;
}