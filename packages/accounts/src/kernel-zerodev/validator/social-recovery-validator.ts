import {
  getChain,
  getUserOperationHash,
  type Address,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
} from "@alchemy/aa-core";
import { KernelBaseValidator, type KernelBaseValidatorParams } from "./base.js";
import { encodeFunctionData, toBytes, type Hash } from "viem";
import { SocialRecoveryValidatorAbi } from "../abis/SocialRecoveryValidatorAbi.js";
import { getChainId } from "../api/index.js";
import { DUMMY_ECDSA_SIG } from "../constants.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import axios from "axios";
import type { SocialRecoveryProvider } from "../validator-provider/social-recovery-provider.js";

export interface SocialRecoveryValidatorParams
  extends KernelBaseValidatorParams {
  owner: SmartAccountSigner;
}

type Guardians = {
  [address: string]: number;
};

type GuardianData = {
  guardians: Guardians;
  threshold: number;
  owneraddress: string;
};

export class SocialRecoveryValidator extends KernelBaseValidator {
  protected owner: SmartAccountSigner;

  constructor(params: SocialRecoveryValidatorParams) {
    super(params);
    this.owner = params.owner;
  }

  public static async init(
    params: SocialRecoveryValidatorParams
  ): Promise<SocialRecoveryValidator> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new SocialRecoveryValidator({ ...params, chain });
    return instance;
  }

  async signer(): Promise<SmartAccountSigner> {
    return await Promise.resolve(this.owner);
  }

  async getOwner(): Promise<Hex> {
    return this.owner.getAddress();
  }

  async getEnableData(): Promise<Hex> {
    return this.getOwner();
  }

  async setGuardians(
    guardians: GuardianData,
    socialrecoveryprovider: SocialRecoveryProvider
  ): Promise<any> {
    const API_URL = "http://localhost:4001/v1/socialrecovery/set-guardian";
    const response = await axios.post(API_URL, guardians);
    const guardiancalldata = response.data.data.guardian_calldata;

    console.log(guardiancalldata);
    const enablecalldata = this.encodeEnable(guardiancalldata);

    await socialrecoveryprovider.getAccount().getInitCode();

    const result = socialrecoveryprovider.sendUserOperation({
      target: "0xcf6A8492E379c3fCd61D8085C7FFBc4A0F014e13",
      data: enablecalldata,
      value: 0n,
    });

    const res = await socialrecoveryprovider.waitForUserOperationTransaction(
      (
        await result
      ).hash as Hash
    );

    return {
     res
    };
  }

  async initRecovery(
    ownerAddress: Address,
    newOwnerAddress: Address,
    socialrecoveryprovider: SocialRecoveryProvider
  ){
    const API_URL = "http://localhost:4001/v1/socialrecovery/init-recovery";
    const response = await axios.post(API_URL, {
      owneraddress: ownerAddress,
      newowneraddress: newOwnerAddress,
    });

    const calldata:Hash = `0x03${newOwnerAddress.slice(2)}`;
    const enablecalldata = this.encodeEnable(calldata);

    const result = socialrecoveryprovider.sendUserOperation({
      target: "0xcf6A8492E379c3fCd61D8085C7FFBc4A0F014e13",
      data: enablecalldata,
      value: 0n,
    });

    await socialrecoveryprovider.waitForUserOperationTransaction(
      (
        await result
      ).hash as Hash
    );
    return response.data.data;
  }

  async addSignatures(
    recoveryid: string,
    signature: string,
    owneraddress: Address
  ): Promise<any> {
    try {
      const API_URL = "http://localhost:4001/v1/socialrecovery/add-signature";
      const response = await axios.post(API_URL, {
        recoveryid,
        signature,
        owneraddress,
      });
      return response.data.data;
    } catch (e) {
      console.log(e);
    }
  }

  async getGuardianCallData(
    recoveryid: string,
    owneraddress: string
  ): Promise<any> {
    try {
      const API_URL =
        "http://localhost:4000/v1/socialrecovery/get-guardian-calldata";
      const response = await axios.post(API_URL, {
        recoveryid,
        owneraddress,
      });
      return response.data.data;
    } catch (e) {
      console.log(e);
    }
  }

  async getrecoveryCallData(
    recoveryid: string,
    owneraddress: Address,
  ): Promise<any> {
    try {
      const API_URL =
        "http://localhost:4001/v1/socialrecovery/generate-recovery-calldata";
      const response = await axios.post(API_URL, {
        recoveryid,
        owneraddress,
      });
      return response.data.data;
    } catch (e) {
      console.log(e);
    }
  }

  async submitRecovery(
    calldata: Hash,
    socialrecoveryprovider: SocialRecoveryProvider
  ): Promise<any> {
    try {

      const enablecalldata = this.encodeEnable(calldata);

      await socialrecoveryprovider.getAccount().getInitCode();

      const result = socialrecoveryprovider.sendUserOperation({
        target: "0xcf6A8492E379c3fCd61D8085C7FFBc4A0F014e13",
        data: enablecalldata,
        value: 0n,
      });

      const res = await socialrecoveryprovider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );
      return res;
    } catch (e) {
      console.log(e);
    }
  }

  encodeEnable(calldata: Hex): Hex {
    return encodeFunctionData({
      abi: SocialRecoveryValidatorAbi,
      functionName: "enable",
      args: [calldata],
    });
  }

  encodeDisable(disableData: Hex = "0x"): Hex {
    return encodeFunctionData({
      abi: SocialRecoveryValidatorAbi,
      functionName: "disable",
      args: [disableData],
    });
  }

  async getDummyUserOpSignature(): Promise<Hex> {
    return DUMMY_ECDSA_SIG;
  }

  async isPluginEnabled(
    kernelAccountAddress: Address,
    selector: Hex
  ): Promise<boolean> {
    if (!this.publicClient) {
      throw new Error("Validator uninitialized: PublicClient missing");
    }
    const execDetail = await this.publicClient.readContract({
      abi: KernelAccountAbi,
      address: kernelAccountAddress,
      functionName: "getExecution",
      args: [selector],
    });
    const enableDataResponse = await this.publicClient.readContract({
      abi: SocialRecoveryValidatorAbi,
      address: this.validatorAddress,
      functionName: "recoveryPluginStorage",
      args: [kernelAccountAddress],
    });

    const enableData = enableDataResponse as `0x${string}`;

    return (
      execDetail.validator.toLowerCase() ===
        this.validatorAddress.toLowerCase() &&
      enableData.toLowerCase() === (await this.getEnableData()).toLowerCase()
    );
  }

  async signMessage(message: string | Uint8Array): Promise<Hex> {
    return await this.owner.signMessage(message);
  }

  async signUserOp(userOp: UserOperationRequest): Promise<Hex> {
    if (!this.chain) {
      throw new Error("Validator uninitialized");
    }
    const hash = getUserOperationHash(
      {
        ...userOp,
        signature: "0x",
      },
      this.entryPointAddress,
      BigInt(this.chain.id)
    );
    const formattedMessage = typeof hash === "string" ? toBytes(hash) : hash;
    return await this.owner.signMessage(formattedMessage);
  }
}
