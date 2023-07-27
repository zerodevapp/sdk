import {
  type Hex,
  type UserOperationRequest,
  type SmartAccountSigner,
  getUserOperationHash,
} from "@alchemy/aa-core";
import { getChain } from "@alchemy/aa-core";
import { encodeFunctionData, toBytes } from "viem";
import { OnOffValidatorAbi } from "../abis/OnOffValidatorAbi.js";
import { KernelBaseValidator, type KernelBaseValidatorParams } from "./base.js";
import { getChainId } from "../api/index.js";

export interface OnOffValidatorParams extends KernelBaseValidatorParams {
  owner: SmartAccountSigner;
}

export class OnOffValidator extends KernelBaseValidator {
  protected owner: SmartAccountSigner;

  constructor(params: OnOffValidatorParams) {
    super(params);
    this.owner = params.owner;
  }

  public static async init(
    params: OnOffValidatorParams
  ): Promise<OnOffValidator> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new OnOffValidator({ ...params, chain });
    return instance;
  }

  async signer(): Promise<SmartAccountSigner> {
    return await Promise.resolve(this.owner);
  }

  async getOwner(): Promise<Hex> {
    return this.owner.getAddress();
  }

  async getEnableData(): Promise<Hex> {
    return await Promise.resolve("0x");
    // return this.getOwner();
  }

  encodeEnable(_enableData: Hex): Hex {
    return encodeFunctionData({
      abi: OnOffValidatorAbi,
      functionName: "enable",
      args: ["0x"],
    });
  }

  encodeDisable(_enableData: Hex = "0x"): Hex {
    return encodeFunctionData({
      abi: OnOffValidatorAbi,
      functionName: "disable",
      args: ["0x"],
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
