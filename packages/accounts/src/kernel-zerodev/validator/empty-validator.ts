import {
  type Address,
  type Hex,
  type SignTypedDataParams,
  type SmartAccountSigner,
  type UserOperationRequest,
} from "@alchemy/aa-core";
import { KernelBaseValidator, type KernelBaseValidatorParams } from "./base.js";

export interface EmptyValidatorParams extends KernelBaseValidatorParams {
  enableData: Hex;
}

export class EmptyValidator extends KernelBaseValidator {
  protected enableData: Hex;

  constructor(params: EmptyValidatorParams) {
    super(params);
    this.enableData = params.enableData;
  }

  public static async fromValidator(
    validator: KernelBaseValidator
  ): Promise<EmptyValidator> {
    const instance = new EmptyValidator({
      enableData: await validator.getEnableData(),
      validatorAddress: validator.getAddress(),
      projectId: "",
    });
    return instance;
  }

  async signer(): Promise<SmartAccountSigner> {
    throw new Error("Method not implemented.");
  }

  async getEnableData(): Promise<Hex> {
    return this.enableData;
  }

  encodeEnable(_newOwner: Hex): Hex {
    throw new Error("Method not implemented.");
  }

  encodeDisable(_disableData: Hex = "0x"): Hex {
    throw new Error("Method not implemented.");
  }

  async getDummyUserOpSignature(): Promise<Hex> {
    throw new Error("Method not implemented.");
  }

  async isPluginEnabled(
    _kernelAccountAddress: Address,
    _selector: Hex
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  async signMessage(_message: string | Uint8Array): Promise<Hex> {
    throw new Error("Method not implemented.");
  }

  async signTypedData(_params: SignTypedDataParams): Promise<Hex> {
    throw new Error("Method not implemented.");
  }

  async signUserOp(_userOp: UserOperationRequest): Promise<Hex> {
    throw new Error("Method not implemented.");
  }
}
