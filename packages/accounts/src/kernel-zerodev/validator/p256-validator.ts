import {
  getUserOperationHash,
  type Address,
  type UserOperationRequest,
  type SignTypedDataParams,
} from "@alchemy/aa-core";
import {
  encodeFunctionData,
  toBytes,
  encodeAbiParameters,
  type Hex,
  concatHex,
  toHex,
} from "viem";
import { KernelBaseValidator, type KernelBaseValidatorParams } from "./base.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { P256ValidatorAbi } from "../abis/P256ValidatorAbi.js";
import { getChainId } from "../api/index.js";
import { getChain } from "../utils.js";
import { P256_VALIDATOR_ADDRESS } from "../constants.js";
import { P256AccountSigner } from "../signer/p256-account.js";
import { ec as EC } from "elliptic";

export interface P256ValidatorParams extends KernelBaseValidatorParams {
  readonly keyPair: EC.KeyPair;
}

export class P256Validator extends KernelBaseValidator {
  private readonly keyPair: EC.KeyPair;
  protected p256Account: P256AccountSigner;

  constructor(params: P256ValidatorParams) {
    super(params);
    this.keyPair = params.keyPair;
    this.p256Account = new P256AccountSigner(this.keyPair); 
  }

  public static async init(
    params: P256ValidatorParams
  ): Promise<P256Validator> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error(`ChainId not found`);
    }
    const chain = getChain(chainId);
    const instance = new P256Validator({
      ...params,
      chain,
      validatorAddress: params.validatorAddress ?? P256_VALIDATOR_ADDRESS,
    });
    return instance;
  }

  encodeEnable(enableData: Hex): Hex {
    return encodeFunctionData({
      abi: P256ValidatorAbi,
      functionName: "enable",
      args: [enableData],
    });
  }

  encodeDisable(): Hex {
    return encodeFunctionData({
      abi: P256ValidatorAbi,
      functionName: "disable",
      args: [],
    });
  }

  async getEnableData(): Promise<Hex> {
    const publicKey = this.keyPair.getPublic();
    const x = toHex(publicKey.getX().toArrayLike(Buffer, "be", 32)) as Hex;
    const y = toHex(publicKey.getY().toArrayLike(Buffer, "be", 32)) as Hex;
    return concatHex([x, y]);
  }

  readonly signMessage = async (
    msg: string | Uint8Array
  ): Promise<`0x${string}`> => {
    this.ensureP256AccountInitialized();
    return this.p256Account?.signMessage(msg);
  };

  readonly signTypedData = async (
    _params: SignTypedDataParams
  ): Promise<`0x${string}`> => {
    this.ensureP256AccountInitialized();
    return this.p256Account?.signTypedData(_params);
  };

  async signUserOp(userOp: UserOperationRequest): Promise<Hex> {
    this.ensureP256AccountInitialized();
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
    ) as Hex;

    const formattedMessage = typeof hash === "string" ? toBytes(hash) : hash;

    const signature = this.keyPair.sign(formattedMessage, { canonical: true });

    const r1: bigint = BigInt(signature.r.toString());
    const s1: bigint = BigInt(signature.s.toString());
    return encodeAbiParameters(
      [
        { type: "uint256", name: "r" },
        { type: "uint256", name: "s" },
      ],
      [r1, s1]
    );
  }

  async signer(): Promise<P256AccountSigner> {
    const signer = new P256AccountSigner(this.keyPair);
    return signer;
  }
  async getDummyUserOpSignature(): Promise<Hex> {
    return "0x00000000366d47b206cb6771cc5dafcb3c6f0b004e3095ddfdf8d4f426294e8755e656be79173fc2b65b98eee2a9625b532308a12c011ba7a830c8904cd9f454046560bb";
  }

  get publicKey() {
    return this.keyPair.getPublic();
  }

  async isPluginEnabled(
    kernelAccountAddress: Address,
    selector: Hex
  ): Promise<boolean> {
    this.ensureP256AccountInitialized();
    const execDetail = await this.publicClient.readContract({
      abi: KernelAccountAbi,
      address: kernelAccountAddress,
      functionName: "getExecution",
      args: [selector],
    });
    const enableData: `0x${string}` = `0x${
      (await this.publicClient.readContract({
        abi: P256ValidatorAbi,
        address: P256_VALIDATOR_ADDRESS,
        functionName: "p256PublicKey",
        args: [kernelAccountAddress],
      })) as string
    }`;

    return (
      execDetail.validator.toLowerCase() ===
        this.validatorAddress.toLowerCase() &&
      enableData.toLowerCase() === (await this.getEnableData()).toLowerCase()
    );
  }

  private ensureP256AccountInitialized(): void {
    if (!this.p256Account) {
      throw new Error(`p256Account is not initialized`);
    }
  }
}
