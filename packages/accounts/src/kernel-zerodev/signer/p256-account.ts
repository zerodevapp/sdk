import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import { hashTypedData, keccak256, concatHex, toBytes, isHex } from "viem";
import { ec as EC } from "elliptic";

export class P256AccountSigner implements SmartAccountSigner {
  private readonly keyPair: EC.KeyPair;

  constructor(keyPair: EC.KeyPair) {
    this.keyPair = keyPair;
  }

  async signMessage(msg: string | Uint8Array): Promise<`0x${string}`> {
    let message: Buffer;
    if (typeof msg === "string" && !isHex(msg)) {
      message = Buffer.from(msg, "utf8");
    } else {
      message = Buffer.from(msg);
    }

    const hash = keccak256(message);

    if (!this.keyPair) {
      throw new Error("Key pair is not initialized");
    }

    const signature = this.keyPair.sign(hash, { canonical: true });

    return concatHex([
      `0x${signature.r.toString(16)}`,
      `0x${signature.s.toString(16)}`,
    ]);
  }

  async signTypedData(_params: SignTypedDataParams): Promise<`0x${string}`> {
    const hash = hashTypedData(_params);
    const messageHashBytes = toBytes(hash);
    const signature = this.keyPair.sign(messageHashBytes, { canonical: true });

    return concatHex([
      `0x${signature.r.toString(16)}`,
      `0x${signature.s.toString(16)}`,
    ]);
  }

  readonly getAddress: () => Promise<`0x${string}`> = async () => {
    throw Error("P256AccountSigner: method not implemented");
  };

  static privateKeyToAccountSigner(privateKey: Uint8Array): P256AccountSigner {
    const ec = new EC("p256");
    const keyPair = ec.keyFromPrivate(privateKey);
    return new P256AccountSigner(keyPair);
  }
}
