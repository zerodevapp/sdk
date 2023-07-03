import { getChain, type Address, type Hex, type SendUserOperationResult } from "@alchemy/aa-core";
import { ValidatorProvider, type ValidatorProviderParamsOpts, type ValidatorProviderParams } from "./base";
import { ECDSAValidator } from "../validator/ecdsa-validator";
import { getChainId } from "../api";
import { polygonMumbai } from "viem/chains";
import { isKernelAccount } from "../account";

export interface ECDSAValidatorProviderParams extends ValidatorProviderParams {
    opts?: ValidatorProviderParamsOpts & {
        ecdsaValidatorConfig?: Omit<ECDSAValidator, keyof ValidatorProviderParams>;
    };
}

export class ECDSAValidatorProvider extends ValidatorProvider {

    private constructor(params: ECDSAValidatorProviderParams) {
        const chain = typeof params.opts?.providerConfig?.chain === "number" ?
            getChain(params.opts.providerConfig.chain) :
            (params.opts?.providerConfig?.chain ?? polygonMumbai);
        super({
            ...params, opts: {
                ...params.opts,
                providerConfig: {
                    chain,
                    ...params.opts?.providerConfig,
                },
                accountConfig: {
                    chain,
                    ...params.opts?.accountConfig,
                }
            }
        });
        this.validator = new ECDSAValidator({
            projectId: params.projectId,
            owner: params.owner,
            chain,
            ...params.opts?.ecdsaValidatorConfig
        });
        if (isKernelAccount(this.provider.account)) {
            this.provider.account.connectValidator(this.validator);
        }
    }

    public static async init(params: ECDSAValidatorProviderParams): Promise<ECDSAValidatorProvider> {
        const chainId = await getChainId(params.projectId);
        if (!chainId) {
            throw new Error("ChainId not found");
        }
        const chain = getChain(chainId);
        const instance = new ECDSAValidatorProvider({
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

    getEncodedEnableData = async (enableData: Address): Promise<Hex> => {
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }
        return await this.validator.encodeEnable(enableData);
    };

    getEncodedDisableData = async (enableData: Address): Promise<Hex> => {
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }
        return await this.validator.encodeDisable(enableData);
    };

    changeOwner = async (newOwner: Address): Promise<SendUserOperationResult> => {
        const encodedEnableData = await this.getEncodedEnableData(newOwner);
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }

        return await this.provider.sendUserOperation({ target: this.validator.validatorAddress, data: encodedEnableData });
    };

    deleteOwner = async (): Promise<SendUserOperationResult> => {
        const encodedDisableData = await this.getEncodedDisableData("0x");
        if (!this.validator) {
            throw new Error("ValidatorProvider: account with validator is not set, did you call all connects first?");
        }

        return await this.provider.sendUserOperation({ target: this.validator.validatorAddress, data: encodedDisableData });
    };
}