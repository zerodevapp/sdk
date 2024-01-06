import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
  type ValidatorProviderParams,
} from "./base.js";
import {
  SessionKeyValidator,
  type SessionKeyParams,
  type SessionKeyValidatorParams,
} from "../validator/session-key-validator.js";
import {
  LocalAccountSigner,
  type Hex,
  type SmartAccountSigner,
  type UserOperationCallData,
  type SendUserOperationResult,
  type UserOperationOverrides,
  type BatchUserOperationCallData,
} from '@alchemy/aa-core';
import { getChainId } from '../api/index.js';
import { polygonMumbai } from 'viem/chains';
import { SESSION_KEY_VALIDATOR_ADDRESS } from '../constants.js';
import { base64ToBytes, bytesToBase64, getChain } from '../utils.js';
import type { RequiredProps, WithRequired } from '../types.js';
import type { KernelBaseValidatorParams } from '../validator/base.js';
import {
  type UserOpDataOperationTypes,
  Operation,
  ZeroDevProvider,
} from '../provider.js';
import { isBatchUserOperationCallData } from '../paymaster/token-paymaster.js';

export type PrefillSessionData = {
  sessionKeyParams: SessionKeyParams &
    WithRequired<SessionKeyParams, 'sessionPrivateKey'>;
};

export type SessionKeyProviderParams = PrefillSessionData &
  ValidatorProviderParams<SessionKeyValidatorParams> &
  Partial<SessionKeyValidatorParams> &
  RequiredProps<KernelBaseValidatorParams>;

export class SessionKeyProvider extends ValidatorProvider<
  SessionKeyValidator,
  SessionKeyValidatorParams
> {
  constructor(
    params: ExtendedValidatorProviderParams<SessionKeyValidatorParams>
  ) {
    const chain =
      typeof params.opts?.providerConfig?.chain === 'number'
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
      throw new Error('ChainId not found');
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

  public static async fromSessionKeyParams(
    params: SessionKeyProviderParams,
    signer?: SmartAccountSigner
  ) {
    let sessionKey = signer;

    if (!sessionKey) {
      sessionKey = LocalAccountSigner.privateKeyToAccountSigner(
        params.sessionKeyParams.sessionPrivateKey
      );
    }
    return await SessionKeyProvider.init({
      ...params,
      sessionKey,
      sessionKeyData: params.sessionKeyParams.sessionKeyData,
      opts: {
        ...params.opts,
        accountConfig: {
          ...params.opts?.accountConfig,
          accountAddress: params.sessionKeyParams.accountAddress,
          initCode: params.sessionKeyParams.initCode,
        },
        validatorConfig: {
          ...params.opts?.validatorConfig,
          executor: params.sessionKeyParams.executor,
          selector: params.sessionKeyParams.selector,
          enableSignature: params.sessionKeyParams.enableSignature,
        },
      },
    });
  }

  async serializeSessionKeyParams(sessionPrivateKey?: Hex): Promise<string> {
    await this.getAccount().approvePlugin();
    let sessionKeyParams = this.getValidator().getSessionData();
    const initCode = await this.getAccount().getInitCode();
    const accountAddress = await this.getAddress();
    if (!initCode) {
      throw Error('initCode not set');
    }
    sessionKeyParams = {
      ...sessionKeyParams,
      sessionPrivateKey,
      initCode,
      accountAddress,
    };
    const jsonString = JSON.stringify(sessionKeyParams);
    const uint8Array = new TextEncoder().encode(jsonString);
    const base64String = bytesToBase64(uint8Array);
    return base64String;
  }

  public static deserializeSessionKeyParams(
    sessionKeyParams: string
  ): PrefillSessionData['sessionKeyParams'] {
    const uint8Array = base64ToBytes(sessionKeyParams);
    const jsonString = new TextDecoder().decode(uint8Array);
    return JSON.parse(jsonString) as PrefillSessionData['sessionKeyParams'];
  }

  public sendUserOperation = async <
    T extends UserOperationCallData | BatchUserOperationCallData
  >(
    data: T,
    overrides?: UserOperationOverrides,
    operation: UserOpDataOperationTypes<T> = Operation.Call as UserOpDataOperationTypes<T>
  ): Promise<SendUserOperationResult> => {
    if (isBatchUserOperationCallData(data)) {
      throw new Error(
        'Batch operations are not supported for session key provider'
      );
    }

    return ZeroDevProvider.prototype.sendUserOperation.call(
      this,
      data,
      overrides,
      operation
    );
  };

  changeSessionKeyData = this.sendEnableUserOperation;

  deleteSessionKey = this.sendDisableUserOperation;
}
