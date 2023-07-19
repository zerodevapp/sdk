import { type SmartAccountSigner } from "@alchemy/aa-core";
import {
  isHex,
  type HDAccount,
  type Hash,
  type PrivateKeyAccount,
  type TypedData,
  type TypedDataDefinition,
  type Hex,
} from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

export class ZeroDevLocalAccountSigner<T extends HDAccount | PrivateKeyAccount>
  implements SmartAccountSigner
{
  private owner: T;
  constructor(owner: T) {
    this.owner = owner;
  }

  readonly signMessage: (msg: string | Uint8Array) => Promise<`0x${string}`> = (
    msg
  ) => {
    if (typeof msg === "string" && !isHex(msg)) {
      return this.owner.signMessage({
        message: msg,
      });
    } else {
      return this.owner.signMessage({
        message: {
          raw: msg,
        },
      });
    }
  };

  readonly signTypedData: <
    TTypedData extends TypedData | { [key: string]: unknown },
    TPrimaryType extends string = string
  >(
    typedData: TypedDataDefinition<TTypedData, TPrimaryType>
  ) => Promise<Hash> = async (typedData) => {
    return await this.owner.signTypedData(typedData);
  };

  readonly getAddress: () => Promise<`0x${string}`> = async () => {
    return this.owner.address;
  };

  static mnemonicToAccountSigner(
    key: string
  ): ZeroDevLocalAccountSigner<HDAccount> {
    const owner = mnemonicToAccount(key);
    return new ZeroDevLocalAccountSigner(owner);
  }

  static privateKeyToAccountSigner(
    key: Hex
  ): ZeroDevLocalAccountSigner<PrivateKeyAccount> {
    const owner = privateKeyToAccount(key);
    return new ZeroDevLocalAccountSigner(owner);
  }
}
