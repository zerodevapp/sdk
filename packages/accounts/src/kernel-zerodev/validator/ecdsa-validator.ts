import {
  getChain,
  getUserOperationHash,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
} from "@alchemy/aa-core";
import { KernelBaseValidator, type KernelBaseValidatorParams } from "./base.js";
import { encodeFunctionData, toBytes } from "viem";
import { ECDSAValidatorAbi } from "../abis/ESCDAValidatorAbi.js";
import { getChainId } from "../api/index.js";

export interface ECDSAValidatorParams extends KernelBaseValidatorParams {
  owner: SmartAccountSigner;
}

export class ECDSAValidator extends KernelBaseValidator {
  protected owner: SmartAccountSigner;

  constructor(params: ECDSAValidatorParams) {
    super(params);
    this.owner = params.owner;
  }

  public static async init(
    params: ECDSAValidatorParams
  ): Promise<ECDSAValidator> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new ECDSAValidator({ ...params, chain });
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

  encodeEnable(newOwner: Hex): Hex {
    return encodeFunctionData({
      abi: ECDSAValidatorAbi,
      functionName: "enable",
      args: [newOwner],
    });
  }

  encodeDisable(enableData: Hex = "0x"): Hex {
    return encodeFunctionData({
      abi: ECDSAValidatorAbi,
      functionName: "disable",
      args: [enableData],
    });
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
