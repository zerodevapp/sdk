import { ValidatorProvider, type ExtendedValidatorProviderParams, type ValidatorProviderParams } from "./base.js";
import { getChain } from "@alchemy/aa-core";
import { getChainId } from "../api/index.js";
import {
  MultiECDSAValidator,
  type MultiECDSAValidatorParams,
} from "../validator/multi-ecdsa-validator.js";
import { polygonMumbai } from "viem/chains";
import type { RequiredProps } from "../types.js";

export type MultiECDSAProviderParams =
  ValidatorProviderParams<MultiECDSAValidatorParams> &
    RequiredProps<MultiECDSAValidatorParams>;

export class MultiECDSAProvider extends ValidatorProvider<MultiECDSAValidatorParams> {
  constructor(params: ExtendedValidatorProviderParams<MultiECDSAValidatorParams>) {
    const chain =
      typeof params.opts?.providerConfig?.chain === "number"
        ? getChain(params.opts.providerConfig.chain)
        : params.opts?.providerConfig?.chain ?? polygonMumbai;
    const validator = new MultiECDSAValidator({
      projectId: params.projectId,
      owner: params.owner,
      addressBook: params.addressBook,
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
    params:  ExtendedValidatorProviderParams<MultiECDSAValidatorParams>
  ): Promise<MultiECDSAProvider> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new MultiECDSAProvider({
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
