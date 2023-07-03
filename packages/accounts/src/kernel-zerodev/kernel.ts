import { ZeroDevProvider, type ZeroDevProviderConfig } from "./provider";
import type { PaymasterConfig, PaymasterPolicy } from "./paymaster/types";
import type { KernelBaseValidatorParams } from "./validator/base";
import { KernelSmartContractAccount, type KernelSmartAccountParams } from "./account";
import type { SupportedValidators } from "./validator/types";
import { getChain, type SmartAccountSigner } from "@alchemy/aa-core";
import { getChainId } from "./api";
import { Validators } from "./validator";

export type CreateZeroDevProviderOpts = {
    paymasterConfig?: PaymasterConfig<PaymasterPolicy>;
    providerConfig?: Omit<ZeroDevProviderConfig, keyof CreateZeroDevProviderConfig>;
    accountConfig?: Omit<KernelSmartAccountParams, keyof CreateZeroDevProviderConfig>;
    validatorConfig?: Omit<KernelBaseValidatorParams, keyof CreateZeroDevProviderConfig>;
};

export interface CreateZeroDevProviderConfig {
    projectId: string;
    owner: SmartAccountSigner;
    validatorType?: SupportedValidators;
    opts?: CreateZeroDevProviderOpts;
}

export async function createZeroDevProvider(params: CreateZeroDevProviderConfig): Promise<ZeroDevProvider> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
        throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    let provider = new ZeroDevProvider({
        projectId: params.projectId,
        chain,
        ...params.opts?.providerConfig,
    });

    const validator = await Validators[params.validatorType ?? "ECDSA"]({
        projectId: params.projectId,
        owner: params.owner,
        ...params.opts?.validatorConfig,
    });

    provider.connect(() =>
        new KernelSmartContractAccount({
            projectId: params.projectId,
            owner: params.owner,
            validator,
            rpcClient: provider.rpcClient,
            ...params.opts?.accountConfig,
        })
    );
    if (params.opts?.paymasterConfig) {
        provider = provider.withZeroDevPaymasterAndData(params.opts.paymasterConfig);
    }
    return provider;

}