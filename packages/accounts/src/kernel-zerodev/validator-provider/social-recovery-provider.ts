import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
} from "./base.js";
import { getChain } from "@alchemy/aa-core";
import { getChainId } from "../api/index.js";
import { polygonMumbai } from "viem/chains";
import {
  SocialRecoveryValidator,
  type SocialRecoveryValidatorParams,
} from "../validator/social-recovery-validator.js";

export class SocialRecoveryProvider extends ValidatorProvider<SocialRecoveryValidatorParams> {
  constructor(
    params: ExtendedValidatorProviderParams<SocialRecoveryValidatorParams>
  ) {
    const chain =
      typeof params.opts?.providerConfig?.chain === "number"
        ? getChain(params.opts.providerConfig.chain)
        : params.opts?.providerConfig?.chain ?? polygonMumbai;
    const validator = new SocialRecoveryValidator({
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
    params: ExtendedValidatorProviderParams<SocialRecoveryValidatorParams>
  ): Promise<SocialRecoveryProvider> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new SocialRecoveryProvider({
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
