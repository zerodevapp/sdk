import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
} from "./base.js";
import {
  P256Validator,
  type P256ValidatorParams,
} from "../validator/p256-validator.js";
import { getChainId } from "../api/index.js";
import { polygonMumbai } from "viem/chains";
import { P256_VALIDATOR_ADDRESS } from "../constants.js";
import { getChain } from "../utils.js";

export class P256Provider extends ValidatorProvider<
  P256Validator,
  P256ValidatorParams
> {
  constructor(params: ExtendedValidatorProviderParams<P256ValidatorParams>) {
    const chain =
      typeof params.opts?.providerConfig?.chain === "number"
        ? getChain(params.opts.providerConfig.chain)
        : params.opts?.providerConfig?.chain ?? polygonMumbai;
    const validator = new P256Validator({
      projectId: params.projectId,
      keyPair: params.keyPair,
      chain,
      validatorAddress:
        params.opts?.validatorConfig?.validatorAddress ??
        P256_VALIDATOR_ADDRESS,
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
    params: ExtendedValidatorProviderParams<P256ValidatorParams>
  ): Promise<P256Provider> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error(`ChainId not found`);
    }

    const chain = getChain(chainId);
    const instance = new P256Provider({
      ...params,
      opts: {
        ...params.opts,
        providerConfig: { chain, ...params.opts?.providerConfig },
      },
    });
    return instance;
  }
}
