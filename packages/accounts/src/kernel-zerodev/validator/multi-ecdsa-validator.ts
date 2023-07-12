import {
  getUserOperationHash,
  type Address,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
  getChain,
} from "@alchemy/aa-core";
import { KernelBaseValidator, type KernelBaseValidatorParams } from "./base.js";
import { encodeFunctionData, toBytes } from "viem";
import { MultiECDSAValidatorAbi } from "../abis/MultiECDSAValidatorAbi.js";
import { getChainId } from "../api/index.js";

export interface MultiECDSAValidatorParams extends KernelBaseValidatorParams {
  owner: SmartAccountSigner;
  addressBook: Address;
}

export class MultiECDSAValidator extends KernelBaseValidator {
  protected owner: SmartAccountSigner;
  protected addressBook: Address;

  constructor(params: MultiECDSAValidatorParams) {
    super(params);
    this.owner = params.owner;
    this.addressBook = params.addressBook;
  }

  public static async init(
    params: MultiECDSAValidatorParams
  ): Promise<MultiECDSAValidator> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new MultiECDSAValidator({ ...params, chain });
    return instance;
  }

  async signer(): Promise<SmartAccountSigner> {
    return await Promise.resolve(this.owner);
  }

  async getOwner(): Promise<Hex> {
    return this.owner.getAddress();
  }

  async getAddressBook(): Promise<Address> {
    return this.addressBook;
  }

  async getEnableData(): Promise<Address> {
    return this.getAddressBook();
  }

  encodeEnable(addressBook: Hex): Hex {
    return encodeFunctionData({
      abi: MultiECDSAValidatorAbi,
      functionName: "enable",
      args: [addressBook],
    });
  }

  encodeDisable(owners: Hex = "0x"): Hex {
    return encodeFunctionData({
      abi: MultiECDSAValidatorAbi,
      functionName: "disable",
      args: [owners],
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
