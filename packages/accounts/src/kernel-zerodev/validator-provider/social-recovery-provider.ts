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
import type { Address, Hash } from "viem";
import axios from "axios";
import {
  isKernelAccount,
} from "../account.js";
import { SOCIAL_RECOVERY_VALIDATOR_ADDRESS } from "../constants.js";

type Guardians = {
  [address: string]: number;
};

type GuardianData = {
  guardians: Guardians;
  threshold: number;
  owneraddress: string;
};

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
      validatorAddress:
        SOCIAL_RECOVERY_VALIDATOR_ADDRESS,
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

  async setGuardians(guardians: GuardianData): Promise<any> {
    try {
      const API_URL = "http://localhost:4001/v1/socialrecovery/set-guardian";
      const response = await axios.post(API_URL, guardians);
      const guardiancalldata = response.data.data.guardian_calldata;

      console.log(guardiancalldata);

      const enablecalldata = await this.getEncodedEnableData(guardiancalldata);

      await this.getAccount().getInitCode();


      if (!isKernelAccount(this.account) || !this.account.validator) {
        throw new Error(
          "ValidatorProvider: account with validator is not set, did you call all connects first?"
        );
      }

      const result =await this.sendUserOperation({
        target: this.getValidator().getAddress(),
        data: enablecalldata,
        value: 0n,
      });

      const res = await this.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );

      return res;
    } catch (err) {
      console.log("Error in setGuardians", err);
      return err;
    }
  }

  async initRecovery(ownerAddress: Address, newOwnerAddress: Address) {
    try {
      const API_URL = "http://localhost:4001/v1/socialrecovery/init-recovery";
      const dbResponse = await axios.post(API_URL, {
        owneraddress: ownerAddress,
        newowneraddress: newOwnerAddress,
      });
      const recoveryId = dbResponse.data.data.recoveryid;

      const calldata: Hash = `0x03${newOwnerAddress.slice(2)}`;

      const encodeCallData = await this.getEncodedEnableData(calldata);

      await this.getAccount().getInitCode();

      if (!isKernelAccount(this.account) || !this.account.validator) {
        throw new Error(
          "ValidatorProvider: account with validator is not set, did you call all connects first?"
        );
      }

      const result = this.sendUserOperation({
        target: this.getValidator().getAddress(),
        data: encodeCallData,
        value: 0n,
      });

      const res = await this.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );

      return {res, recoveryId};
    } catch (err) {
      console.log("Error in initRecovery", err);
      return err;
    }
  }

  async submitRecovery(
    calldata: Hash,
  ){
    try {
      const encodeCallData = await this.getEncodedEnableData(calldata);

      await this.getAccount().getInitCode();

      if (!isKernelAccount(this.account) || !this.account.validator) {
        throw new Error(
          "ValidatorProvider: account with validator is not set, did you call all connects first?"
        );
      }

      const result = this.sendUserOperation({
        target: this.getValidator().getAddress(),
        data: encodeCallData,
        value: 0n,
      });

      const res = await this.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );

      return res;
    } catch (err) {
      console.log("Error in submitRecovery", err);
      return err;
    }
  }
}
