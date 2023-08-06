import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
} from "./base.js";
import {
  ERC165SessionKeyValidator,
  type ERC165SessionKeyValidatorParams,
} from "../validator/erc165-session-key-validator.js";
import { getChain } from "@alchemy/aa-core";
import { getChainId } from "../api/index.js";
import { polygonMumbai } from "viem/chains";
import { ERC165_SESSION_KEY_VALIDATOR_ADDRESS } from "../constants.js";

export class ERC165SessionKeyProvider extends ValidatorProvider<ERC165SessionKeyValidatorParams> {
  constructor(
    params: ExtendedValidatorProviderParams<ERC165SessionKeyValidatorParams>
  ) {
    const chain =
      typeof params.opts?.providerConfig?.chain === "number"
        ? getChain(params.opts.providerConfig.chain)
        : params.opts?.providerConfig?.chain ?? polygonMumbai;
    const validator = new ERC165SessionKeyValidator({
      projectId: params.projectId,
      sessionKey: params.sessionKey,
      sessionKeyData: params.sessionKeyData,
      chain,
      validatorAddress:
        params.opts?.validatorConfig?.validatorAddress ??
        ERC165_SESSION_KEY_VALIDATOR_ADDRESS,
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
    params: ExtendedValidatorProviderParams<ERC165SessionKeyValidatorParams>
  ): Promise<ERC165SessionKeyProvider> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new ERC165SessionKeyProvider({
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

  deleteERC165SessionKeyData = this.sendDisableUserOperation;
}
