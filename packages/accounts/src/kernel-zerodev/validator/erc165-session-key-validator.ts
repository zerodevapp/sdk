import {
  getUserOperationHash,
  type Address,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
  getChain,
  type SignTypedDataParams,
} from "@alchemy/aa-core";
import { KernelBaseValidator, type KernelBaseValidatorParams } from "./base.js";
import { encodeFunctionData, toBytes, concat, pad, toHex } from "viem";
import { ERC165SessionKeyValidatorAbi } from "../abis/ERC165SessionKeyValidatorAbi.js";
import { DUMMY_ECDSA_SIG } from "../constants.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { getChainId } from "../api/index.js";
import { fixSignedData } from "../utils.js";

export interface ERC165SessionKeyValidatorParams
  extends KernelBaseValidatorParams {
  sessionKey: SmartAccountSigner;
  sessionKeyData: SessionKeyData;
}

interface SessionKeyData {
  selector: Hex;
  erc165InterfaceId: Hex;
  validUntil: number;
  validAfter: number;
  addressOffset: number;
}

export class ERC165SessionKeyValidator extends KernelBaseValidator {
  protected sessionKey: SmartAccountSigner;
  sessionKeyData: SessionKeyData;

  constructor(params: ERC165SessionKeyValidatorParams) {
    super(params);
    this.sessionKey = params.sessionKey;
    this.sessionKeyData = params.sessionKeyData;
  }

  public static async init(
    params: ERC165SessionKeyValidatorParams
  ): Promise<ERC165SessionKeyValidator> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new ERC165SessionKeyValidator({ ...params, chain });
    return instance;
  }

  async signer(): Promise<SmartAccountSigner> {
    return await Promise.resolve(this.sessionKey);
  }

  async getEnableData(): Promise<Hex> {
    return concat([
      await this.sessionKey.getAddress(),
      pad(this.sessionKeyData.erc165InterfaceId, { size: 4 }),
      pad(this.sessionKeyData.selector, { size: 4 }),
      pad(toHex(this.sessionKeyData.validUntil), { size: 6 }),
      pad(toHex(this.sessionKeyData.validAfter), { size: 6 }),
      pad(toHex(this.sessionKeyData.addressOffset), { size: 4 }),
    ]);
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
    const enableData = await this.publicClient.readContract({
      abi: ERC165SessionKeyValidatorAbi,
      address: this.validatorAddress,
      functionName: "sessionKeys",
      args: [await this.sessionKey.getAddress(), kernelAccountAddress],
    });
    const enableDataHex = concat([
      await this.sessionKey.getAddress(),
      pad(enableData[2], { size: 4 }),
      pad(enableData[1], { size: 4 }),
      pad(toHex(enableData[3]), { size: 6 }),
      pad(toHex(enableData[4]), { size: 6 }),
      pad(toHex(enableData[5]), { size: 4 }),
    ]);
    return (
      execDetail.validator.toLowerCase() ===
        this.validatorAddress.toLowerCase() &&
      enableData[0] &&
      enableDataHex.toLowerCase() === (await this.getEnableData()).toLowerCase()
    );
  }

  async getDummyUserOpSignature(): Promise<Hex> {
    return DUMMY_ECDSA_SIG;
  }

  encodeEnable(sessionKeyEnableData: Hex): Hex {
    return encodeFunctionData({
      abi: ERC165SessionKeyValidatorAbi,
      functionName: "enable",
      args: [sessionKeyEnableData],
    });
  }

  encodeDisable(sessionKey: Hex): Hex {
    return encodeFunctionData({
      abi: ERC165SessionKeyValidatorAbi,
      functionName: "disable",
      args: [sessionKey],
    });
  }

  async signMessage(message: string | Uint8Array): Promise<Hex> {
    return await this.sessionKey.signMessage(message);
  }

  async signTypedData(params: SignTypedDataParams): Promise<Hex> {
    return fixSignedData(await this.sessionKey.signTypedData(params));
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
    return await this.sessionKey.signMessage(formattedMessage);
  }
}
