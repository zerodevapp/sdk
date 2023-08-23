import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
} from "./base.js";
import {
  SessionKeyValidator,
  type SessionData,
  type SessionKeyValidatorParams,
} from "../validator/session-key-validator.js";
import { getChain, type Hex } from "@alchemy/aa-core";
import { getChainId } from "../api/index.js";
import { polygonMumbai } from "viem/chains";
import { SESSION_KEY_VALIDATOR_ADDRESS } from "../constants.js";
import { base64ToBytes, bytesToBase64 } from "../utils.js";

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

  async serializeSessionData(sessionPrivateKey: Hex): Promise<string> {
    let sessionData = this.getValidator().getSessionData();
    const initCode = await this.getAccount().getInitCode();
    const accountAddress = await this.getAddress();
    if (!initCode) {
      throw Error("initCode not set");
    }
    sessionData = {
      ...sessionData,
      sessionPrivateKey,
      initCode,
      accountAddress,
    };
    const jsonString = JSON.stringify(sessionData);
    const uint8Array = new TextEncoder().encode(jsonString);
    const base64String = bytesToBase64(uint8Array);
    return base64String;
  }

  public static deserializeSessionData(
    sessionData: string
  ): Required<SessionData> {
    const uint8Array = base64ToBytes(sessionData);
    const jsonString = new TextDecoder().decode(uint8Array);
    const sessionKeyData = JSON.parse(jsonString) as Required<SessionData>;
    return sessionKeyData;
  }

  changeSessionKeyData = this.sendEnableUserOperation;

  deleteSessionKey = this.sendDisableUserOperation;
}
