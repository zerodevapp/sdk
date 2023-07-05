import { getChain } from "@alchemy/aa-core";
import { getChainId } from "../api";
import type { SupportedValidators, ValidatorParamsMap } from "../validator/types";
import type { ValidatorProviderParams } from "./base";
import type { ValidatorProviderTypeMap } from "./types";
import { ValidatorProviders } from ".";

export async function createProvider<V extends SupportedValidators>(validatortype: V, params: ValidatorProviderParams<ValidatorParamsMap[V]>): Promise<ValidatorProviderTypeMap[V]> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
        throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new ValidatorProviders[validatortype]({
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