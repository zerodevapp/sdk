import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
} from "./base.js";
import {
  ECDSAValidator,
  type ECDSAValidatorParams,
} from "../validator/ecdsa-validator.js";
import { getChainId } from "../api/index.js";
import { polygonMumbai } from "viem/chains";
import { getChain } from "../utils.js";

export class ECDSAProvider extends ValidatorProvider<
  ECDSAValidator,
  ECDSAValidatorParams
> {
  constructor(params: ExtendedValidatorProviderParams<ECDSAValidatorParams>) {
    const chain =
      typeof params.opts?.providerConfig?.chain === "number"
        ? getChain(params.opts.providerConfig.chain)
        : params.opts?.providerConfig?.chain ?? polygonMumbai;
    const validator = new ECDSAValidator({
      projectId: params.projectId,
      owner: params.owner,
      chain,
      rpcUrl: params.opts?.providerConfig?.rpcUrl,
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
    params: ExtendedValidatorProviderParams<ECDSAValidatorParams>
  ): Promise<ECDSAProvider> {
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
          ...params.opts?.providerConfig,
        },
      },
    });
    return instance;
  }

  changeOwner = this.sendEnableUserOperation;

  deleteOwner = this.sendDisableUserOperation;
}
