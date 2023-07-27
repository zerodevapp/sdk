import { getChain } from "@alchemy/aa-core";

import {
  OnOffValidator,
  type OnOffValidatorParams,
} from "../validator/on-off-validator.js";
import { polygonMumbai } from "viem/chains";
import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
} from "./base.js";
import { getChainId } from "../api/index.js";

export class OnOffProvider extends ValidatorProvider<OnOffValidatorParams> {
  constructor(params: ExtendedValidatorProviderParams<OnOffValidatorParams>) {
    const chain =
      typeof params.opts?.providerConfig?.chain === "number"
        ? getChain(params.opts.providerConfig.chain)
        : params.opts?.providerConfig?.chain ?? polygonMumbai;
    const validator = new OnOffValidator({
      projectId: params.projectId,
      owner: params.owner,
      chain,
      ...params.opts?.validatorConfig,
    });
    super(
      {
        ...params,
        opts: {
          ...params.opts,
          providerConfig: { ...params.opts?.providerConfig, chain },
        },
      },
      validator
    );
  }

  public static async init(
    params: ExtendedValidatorProviderParams<OnOffValidatorParams>
  ): Promise<OnOffProvider> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new OnOffProvider({
      ...params,
      opts: {
        ...params.opts,
        providerConfig: {
          chain,
          ...params.opts?.providerConfig,
        },
      },
    });
    return instance;
  }

  changeOwner = this.sendEnableUserOperation;

  deleteOwner = this.sendDisableUserOperation;
}
