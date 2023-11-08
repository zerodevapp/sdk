import {
  type SignTypedDataParams,
  type SmartAccountSigner,
  type UserOperationRequest,
} from "@alchemy/aa-core";
import {
  concat,
  type Chain,
  type Hex,
  pad,
  toHex,
  type Address,
  concatHex,
  hexToBigInt,
  type PublicClient,
  type Transport,
  createPublicClient,
  http,
  zeroAddress,
} from "viem";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import {
  BUNDLER_URL,
  CHAIN_ID_TO_NODE,
  ECDSA_VALIDATOR_ADDRESS,
  ENTRYPOINT_ADDRESS,
  KERNEL_IMPL_ADDRESS,
} from "../constants.js";
import { polygonMumbai } from "viem/chains";

export enum ValidatorMode {
  sudo = "0x00000000",
  plugin = "0x00000001",
  enable = "0x00000002",
}

export interface KernelBaseValidatorParams {
  projectId: string;
  validatorAddress?: Hex;
  mode?: ValidatorMode;
  chain?: Chain;
  entryPointAddress?: Address;
  enableSignature?: Hex;
  validUntil?: number;
  validAfter?: number;
  executor?: Address;
  selector?: Hex;
  rpcUrl?: string;
}

export type ValidatorPluginData = Required<
  Pick<
    KernelBaseValidatorParams,
    "executor" | "selector" | "validAfter" | "validUntil"
  >
>;

//Kernel wallet implementation separates out validation and execution phase. It allows you to have
// custom wrapper logic for the validation phase in addition to signature of choice.
export abstract class KernelBaseValidator {
  readonly validatorAddress: Hex;
  mode: ValidatorMode;
  protected projectId: string;
  protected chain?: Chain;
  protected entryPointAddress: Address;
  protected enableSignature?: Hex;
  protected validUntil: number;
  protected validAfter: number;
  protected executor?: Address;
  protected selector?: Hex;
  protected rpcUrl?: string;
  publicClient?: PublicClient<Transport, Chain>;

  constructor(params: KernelBaseValidatorParams) {
    this.projectId = params.projectId;
    this.validatorAddress = params.validatorAddress ?? ECDSA_VALIDATOR_ADDRESS;
    this.mode = params.mode ?? ValidatorMode.sudo;
    this.entryPointAddress = params.entryPointAddress ?? ENTRYPOINT_ADDRESS;
    this.enableSignature = params.enableSignature;
    this.validUntil = params.validUntil ?? 0;
    this.validAfter = params.validAfter ?? 0;
    this.executor = params.executor;
    this.selector = params.selector;
    this.chain = params.chain;
    this.rpcUrl = params.rpcUrl ?? BUNDLER_URL;
    this.publicClient = createPublicClient({
      transport: http(CHAIN_ID_TO_NODE[this.chain?.id ?? polygonMumbai.id]),
      chain: this.chain ?? polygonMumbai,
    });
  }

  abstract encodeEnable(enableData: Hex): Hex;

  abstract encodeDisable(enableData: Hex): Hex;

  abstract getEnableData(): Promise<Hex>;

  abstract signMessage(message: Uint8Array | string | Hex): Promise<Hex>;

  abstract signTypedData(params: SignTypedDataParams): Promise<Hex>;

  abstract signUserOp(userOp: UserOperationRequest): Promise<Hex>;

  abstract signer(): Promise<SmartAccountSigner>;

  abstract getDummyUserOpSignature(callData?: Hex): Promise<Hex>;

  abstract isPluginEnabled(
    kernelAccountAddress: Address,
    selector: Hex
  ): Promise<boolean>;

  shouldDelegateViaFallback(): boolean {
    return true;
  }

  getPluginValidatorData(): ValidatorPluginData {
    if (!this.selector || !this.executor) {
      throw Error("Plugin Validator data params uninitialised");
    }
    return {
      selector: this.selector,
      executor: this.executor,
      validAfter: this.validAfter,
      validUntil: this.validUntil,
    };
  }

  getNonceKey(): bigint {
    return 0n;
  }

  async getDynamicDummySignature(
    kernelAccountAddress: Address,
    calldata: Hex
  ): Promise<Hex> {
    const dummyECDSASig =
      "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
    const validatorMode = await this.resolveValidatorMode(
      kernelAccountAddress,
      calldata
    );
    if (validatorMode === ValidatorMode.enable) {
      const enableData = await this.getEnableData();
      const enableDataLength = enableData.length / 2 - 1;
      const enableSigLength = 65;
      const staticDummySig = concatHex([
        "0x000000000000000000000000",
        this.getAddress(),
        this.executor!,
      ]);

      return concatHex([
        ValidatorMode.enable,
        staticDummySig,
        pad(toHex(enableDataLength), { size: 32 }),
        enableData,
        pad(toHex(enableSigLength), { size: 32 }),
        dummyECDSASig,
        await this.getDummyUserOpSignature(calldata),
      ]);
    }
    return concatHex([
      validatorMode,
      await this.getDummyUserOpSignature(calldata),
    ]);
  }

  setEnableSignature(enableSignature: Hex) {
    this.enableSignature = enableSignature;
  }

  getEnableSignature(): Hex | undefined {
    return this.enableSignature;
  }

  getAddress(): Hex {
    return this.validatorAddress;
  }

  getPublicClient(): PublicClient<Transport, Chain> {
    if (!this.publicClient) {
      throw new Error("Validator uninitialized: PublicClient missing");
    }
    return this.publicClient;
  }

  async approveExecutor(
    kernel: Address,
    selector: Hex,
    executor: Address,
    validUntil: number,
    validAfter: number,
    validator: KernelBaseValidator
  ): Promise<Hex> {
    if (!this.chain) {
      throw new Error("Validator uninitialized");
    }
    let kernelImplAddr;
    try {
      const strgAddr = await this.getPublicClient().getStorageAt({
        address: kernel,
        slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
      });
      kernelImplAddr = strgAddr
        ? (("0x" + strgAddr.slice(26)) as Hex)
        : strgAddr;
    } catch (error) {}
    const sender = kernel;
    const signer = await this.signer();
    const ownerSig = await signer.signTypedData({
      domain: {
        name: "Kernel",
        version:
          kernelImplAddr?.toLowerCase() === KERNEL_IMPL_ADDRESS.toLowerCase() ||
          kernelImplAddr?.toLowerCase() ===
            "0x8dD4DBB54d8A8Cf0DE6F9CCC4609470A30EfF18C".toLowerCase() ||
          kernelImplAddr === undefined ||
          kernelImplAddr === zeroAddress
            ? "0.2.2"
            : "0.2.1",
        chainId: this.chain.id,
        verifyingContract: sender,
      },
      types: {
        ValidatorApproved: [
          { name: "sig", type: "bytes4" },
          { name: "validatorData", type: "uint256" },
          { name: "executor", type: "address" },
          { name: "enableData", type: "bytes" },
        ],
      },
      message: {
        sig: selector as Hex,
        validatorData: hexToBigInt(
          concatHex([
            pad(toHex(validUntil), { size: 6 }),
            pad(toHex(validAfter), { size: 6 }),
            validator.getAddress(),
          ]),
          { size: 32 }
        ),
        executor: executor as Address,
        enableData: await validator.getEnableData(),
      },
      primaryType: "ValidatorApproved",
    });
    return ownerSig;
  }

  async resolveValidatorMode(
    kernelAccountAddress: Address,
    callData: Hex
  ): Promise<ValidatorMode> {
    if (!this.chain || !this.publicClient) {
      throw new Error("Validator uninitialized");
    }

    let mode: ValidatorMode;
    try {
      const defaultValidatorAddress = await this.publicClient.readContract({
        abi: KernelAccountAbi,
        address: kernelAccountAddress,
        functionName: "getDefaultValidator",
      });
      if (
        defaultValidatorAddress?.toLowerCase() ===
          this.validatorAddress.toLowerCase() ||
        this.mode === ValidatorMode.sudo
      ) {
        mode = ValidatorMode.sudo;
      } else if (
        await this.isPluginEnabled(
          kernelAccountAddress,
          callData.toString().slice(0, 10) as Hex
        )
      ) {
        mode = ValidatorMode.plugin;
      } else {
        mode = ValidatorMode.enable;
      }
    } catch (error) {
      if (this.mode === ValidatorMode.plugin) {
        mode = ValidatorMode.enable;
      } else {
        mode = this.mode;
      }
    }
    return mode;
  }

  async getSignature(userOp: UserOperationRequest): Promise<Hex> {
    const mode = await this.resolveValidatorMode(
      userOp.sender,
      userOp.callData
    );
    if (mode === ValidatorMode.sudo || mode === ValidatorMode.plugin) {
      return concatHex([this.mode, await this.signUserOp(userOp)]);
    } else {
      const enableData = await this.getEnableData();
      const enableDataLength = enableData.length / 2 - 1;
      const enableSignature = this.getEnableSignature();
      if (!enableSignature) {
        throw new Error("Enable signature not set");
      }
      return concat([
        mode, // 4 bytes 0 - 4
        pad(toHex(this.validUntil), { size: 6 }), // 6 bytes 4 - 10
        pad(toHex(this.validAfter), { size: 6 }), // 6 bytes 10 - 16
        pad(this.validatorAddress, { size: 20 }), // 20 bytes 16 - 36
        pad(this.executor!, { size: 20 }), // 20 bytes 36 - 56
        pad(toHex(enableDataLength), { size: 32 }), // 32 bytes 56 - 88
        enableData, // 88 - 88 + enableData.length
        pad(toHex(enableSignature.length / 2 - 1), { size: 32 }), // 32 bytes 88 + enableData.length - 120 + enableData.length
        enableSignature, // 120 + enableData.length - 120 + enableData.length + enableSignature.length
        await this.signUserOp(userOp), // 120 + enableData.length + enableSignature.length - 120 + enableData.length + enableSignature.length + userOperation.length
      ]);
    }
  }
}
