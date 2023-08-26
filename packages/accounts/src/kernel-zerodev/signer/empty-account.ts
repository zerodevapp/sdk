import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import { type Hex } from "viem";

export class EmptyAccountSigner implements SmartAccountSigner {
  private owner: Hex;
  constructor(owner: Hex) {
    this.owner = owner;
  }

  readonly signMessage: (msg: string | Uint8Array) => Promise<`0x${string}`> = (
    _msg
  ) => {
    throw Error("EmptyAccountSigner: method not implemented");
  };

  readonly signTypedData = (_params: SignTypedDataParams) => {
    throw Error("EmptyAccountSigner: method not implemented");
  };

  readonly getAddress: () => Promise<`0x${string}`> = async () => {
    return this.owner;
  };

  static addressToAccountSigner(ownerAddress: Hex): EmptyAccountSigner {
    return new EmptyAccountSigner(ownerAddress);
  }
}
