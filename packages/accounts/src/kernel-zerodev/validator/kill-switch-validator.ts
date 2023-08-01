import {
  getChain,
  getUserOperationHash,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
} from "@alchemy/aa-core";
import {
  KernelBaseValidator,
  ValidatorMode,
  type KernelBaseValidatorParams,
} from "./base.js";
import {
  concat,
  concatHex,
  encodeFunctionData,
  keccak256,
  pad,
  toBytes,
  toHex,
} from "viem";
import { KillSwitchValidatorAbi } from "../abis/KillSwitchValidatorAbi.js";
import { getChainId } from "../api/index.js";
import { DUMMY_ECDSA_SIG } from "../constants.js";

export interface KillSwitchValidatorParams extends KernelBaseValidatorParams {
  guardian: SmartAccountSigner;
  delaySeconds: number;
}

export class KillSwitchValidator extends KernelBaseValidator {
  protected guardian: SmartAccountSigner;
  protected delaySeconds: number;

  constructor(params: KillSwitchValidatorParams) {
    super(params);
    this.guardian = params.guardian;
    this.delaySeconds = params.delaySeconds;
  }

  public static async init(
    params: KillSwitchValidatorParams
  ): Promise<KillSwitchValidator> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new KillSwitchValidator({ ...params, chain });
    return instance;
  }

  async signer(): Promise<SmartAccountSigner> {
    return await Promise.resolve(this.guardian);
  }

  async getEnableData(): Promise<Hex> {
    return await (await this.signer()).getAddress();
  }

  getPausedUntil(): number {
    return Math.floor(Date.now() / 1000) + this.delaySeconds;
  }

  encodeEnable(newGuardian: Hex): Hex {
    return encodeFunctionData({
      abi: KillSwitchValidatorAbi,
      functionName: "enable",
      args: [newGuardian],
    });
  }

  encodeDisable(disableData: Hex = "0x"): Hex {
    return encodeFunctionData({
      abi: KillSwitchValidatorAbi,
      functionName: "disable",
      args: [disableData],
    });
  }

  async getDummyUserOpSignature(): Promise<Hex> {
    if (this.mode === ValidatorMode.sudo) {
      return DUMMY_ECDSA_SIG;
    } else {
      const pausedUntil = this.getPausedUntil();
      return concatHex([pad(toHex(pausedUntil), { size: 6 }), DUMMY_ECDSA_SIG]);
    }
  }

  async signMessage(message: string | Uint8Array): Promise<Hex> {
    return await this.guardian.signMessage(message);
  }

  async signUserOp(userOp: UserOperationRequest): Promise<Hex> {
    const pausedUntil = this.getPausedUntil();
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

    const extendedHash = keccak256(
      concat([pad(toHex(pausedUntil), { size: 6 }), hash])
    );
    const signature = concat([
      pad(toHex(pausedUntil), { size: 6 }),
      await this.guardian.signMessage(toBytes(extendedHash)),
    ]);
    return signature;
  }
}
