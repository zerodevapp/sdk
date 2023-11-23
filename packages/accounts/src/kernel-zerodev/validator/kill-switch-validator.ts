import {
  getUserOperationHash,
  type Address,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
  type SignTypedDataParams,
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
  getContract,
  keccak256,
  pad,
  toBytes,
  toHex,
} from "viem";
import { KillSwitchValidatorAbi } from "../abis/KillSwitchValidatorAbi.js";
import { getChainId } from "../api/index.js";
import { DUMMY_ECDSA_SIG } from "../constants.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { fixSignedData, getChain } from "../utils.js";

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
    this.mode = params.mode ?? ValidatorMode.plugin;
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

  async isPluginEnabled(
    kernelAccountAddress: Address,
    selector: Hex
  ): Promise<boolean> {
    if (!this.publicClient) {
      throw new Error("Validator uninitialized: PublicClient missing");
    }
    const kernel = getContract({
      abi: KernelAccountAbi,
      address: kernelAccountAddress,
      publicClient: this.publicClient,
    });
    const execDetail = await kernel.read.getExecution([selector]);
    const enableData = await this.publicClient.readContract({
      abi: KillSwitchValidatorAbi,
      address: this.validatorAddress,
      functionName: "killSwitchValidatorStorage",
      args: [kernelAccountAddress],
    });
    const pausedUntil = Math.floor(Date.now() / 1000) + this.delaySeconds;
    return (
      execDetail.validator.toLowerCase() ===
        this.validatorAddress.toLowerCase() &&
      enableData[0] === (await this.getEnableData()) &&
      enableData[3] === (await kernel.read.getDisabledMode()) &&
      enableData[2] === pausedUntil &&
      enableData[1].toLowerCase() ===
        (await kernel.read.getDefaultValidator()).toLowerCase()
    );
  }

  async getDummyUserOpSignature(): Promise<Hex> {
    if (this.mode === ValidatorMode.sudo) {
      return DUMMY_ECDSA_SIG;
    }
    return concatHex([pad("0xffffffffffff", { size: 6 }), DUMMY_ECDSA_SIG]);
  }

  async signMessage(message: string | Uint8Array): Promise<Hex> {
    return await this.guardian.signMessage(message);
  }

  async signTypedData(params: SignTypedDataParams): Promise<Hex> {
    return fixSignedData(await this.guardian.signTypedData(params));
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

    if (this.mode === ValidatorMode.sudo) {
      const formattedMessage = typeof hash === "string" ? toBytes(hash) : hash;
      return await this.guardian.signMessage(formattedMessage);
    }

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
