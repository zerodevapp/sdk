import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
} from "./base.js";
import {
  SessionKeyValidator,
  type SessionKeyValidatorParams,
} from "../validator/session-key-validator.js";
import { getChain } from "@alchemy/aa-core";
import { getChainId } from "../api/index.js";
import { polygonMumbai } from "viem/chains";
import { SESSION_KEY_VALIDATOR_ADDRESS } from "../constants.js";

export class SessionKeyProvider extends ValidatorProvider<
  SessionKeyValidator,
  SessionKeyValidatorParams
> {
  constructor(
    params: ExtendedValidatorProviderParams<SessionKeyValidatorParams>
  ) {
    const chain =
      typeof params.opts?.providerConfig?.chain === "number"
        ? getChain(params.opts.providerConfig.chain)
        : params.opts?.providerConfig?.chain ?? polygonMumbai;
    const validator = new SessionKeyValidator({
      projectId: params.projectId,
      sessionKey: params.sessionKey,
      sessionKeyData: params.sessionKeyData,
      chain,
      validatorAddress:
        params.opts?.validatorConfig?.validatorAddress ??
        SESSION_KEY_VALIDATOR_ADDRESS,
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
    params: ExtendedValidatorProviderParams<SessionKeyValidatorParams>
  ): Promise<SessionKeyProvider> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new SessionKeyProvider({
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

  changeSessionKeyData = this.sendEnableUserOperation;

  deleteSessionKey = this.sendDisableUserOperation;
}
