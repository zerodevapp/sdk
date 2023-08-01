import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
} from "./base.js";
import {
  KillSwitchValidator,
  type KillSwitchValidatorParams,
} from "../validator/kill-switch-validator.js";
import { getChain } from "@alchemy/aa-core";
import { getChainId } from "../api/index.js";
import { polygonMumbai } from "viem/chains";
import { KILL_SWITCH_VALIDATOR_ADDRESS } from "../constants.js";

export class KillSwitchProvider extends ValidatorProvider<KillSwitchValidatorParams> {
  constructor(
    params: ExtendedValidatorProviderParams<KillSwitchValidatorParams>
  ) {
    const chain =
      typeof params.opts?.providerConfig?.chain === "number"
        ? getChain(params.opts.providerConfig.chain)
        : params.opts?.providerConfig?.chain ?? polygonMumbai;
    const validator = new KillSwitchValidator({
      projectId: params.projectId,
      guardian: params.guardian,
      delaySeconds: params.delaySeconds,
      chain,
      validatorAddress:
        params.opts?.validatorConfig?.validatorAddress ??
        KILL_SWITCH_VALIDATOR_ADDRESS,
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
    params: ExtendedValidatorProviderParams<KillSwitchValidatorParams>
  ): Promise<KillSwitchProvider> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new KillSwitchProvider({
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

  changeGuardian = this.sendEnableUserOperation;

  deleteKillSwitchData = this.sendDisableUserOperation;
}
