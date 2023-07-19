import {
  encodePacked,
  fromBytes,
  toBytes,
  type Hex,
  type WalletClient,
} from "viem";
import type {
  SmartAccountSigner,
  UserOperationCallData,
} from "@alchemy/aa-core";
import { Wallet } from "@ethersproject/wallet";
import { Web3Provider, type ExternalProvider } from "@ethersproject/providers";
import { API_URL, gasTokenChainAddresses } from "./constants.js";
import type { SupportedGasToken } from "./paymaster/types.js";
import axios from "axios";

export type UserOperationCallDataWithDelegate = UserOperationCallData & {
  delegateCall?: boolean;
};

export type BatchUserOperationCallDataWithDelegate =
  UserOperationCallDataWithDelegate[];

const encodeCall = (_tx: UserOperationCallDataWithDelegate): string => {
  const data = toBytes(_tx.data);
  const encoded = encodePacked(
    ["uint8", "address", "uint256", "uint256", "bytes"],
    [
      _tx.delegateCall ? 1 : 0,
      _tx.target,
      _tx.value || BigInt(0),
      BigInt(data.length),
      fromBytes(data, "hex"),
    ]
  );
  return encoded.slice(2);
};
export const encodeMultiSend = (
  _txs: BatchUserOperationCallDataWithDelegate
): Hex => {
  return ("0x" + _txs.map((tx) => encodeCall(tx)).join("")) as Hex;
};

export function getGasTokenAddress(
  gasToken: SupportedGasToken,
  chainId: number
): Hex | undefined {
  if (gasToken === "TEST_ERC20") {
    return "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B";
  }
  return gasTokenChainAddresses[gasToken][chainId] || undefined;
}

export const convertWalletClientToAccountSigner = (
  client: WalletClient
): SmartAccountSigner => {
  return {
    getAddress: async () =>
      Promise.resolve((await client.getAddresses())[0] as `0x${string}`),
    signMessage: async (message: Uint8Array | string) =>
      (await client.signMessage({
        account: client.account!,
        message:
          typeof message === "string"
            ? message
            : {
                raw: message,
              },
      })) as `0x${string}`,
  };
};

export const convertWalletToAccountSigner = (
  wallet: Wallet
): SmartAccountSigner => {
  return {
    getAddress: async () => Promise.resolve(wallet.address as `0x${string}`),
    signMessage: async (msg: Uint8Array | string) =>
      (await wallet.signMessage(msg)) as `0x${string}`,
  };
};

export function getRPCProviderOwner(web3Provider: any): SmartAccountSigner {
  const provider = new Web3Provider(web3Provider as ExternalProvider);
  const signer = provider.getSigner();

  return {
    getAddress: async () =>
      Promise.resolve((await signer.getAddress()) as `0x${string}`),
    signMessage: async (msg: Uint8Array | string) =>
      (await signer.signMessage(msg)) as `0x${string}`,
  };
}

export async function getCustodialOwner(
  identifier: string,
  {
    custodialFilePath,
    privateKey,
    publicKey,
    keyId,
    apiUrl = API_URL,
  }: {
    privateKey?: string;
    publicKey?: string;
    keyId?: string;
    custodialFilePath?: string;
    apiUrl?: string;
  }
): Promise<SmartAccountSigner | undefined> {
  if (custodialFilePath) {
    let fsModule;
    try {
      fsModule = require.resolve("fs") && require("fs");
    } catch (error) {
      console.log("FS module not available. Skipping FS operation...");
      return;
    }
    const data = fsModule.readFileSync(custodialFilePath, "utf8");
    const values = data.split("\n");
    [privateKey, publicKey, keyId] = values;
  }
  let TurnkeySigner;
  try {
    TurnkeySigner =
      require.resolve("@turnkey/ethers") &&
      require("@turnkey/ethers").TurnkeySigner;
  } catch (error) {
    console.log(
      "@turnkey/ethers module not available. Skipping FS operation..."
    );
    return;
  }
  if (!privateKey || !publicKey || !keyId) {
    throw new Error(
      "Must provide custodialFilePath or privateKey, publicKey, and keyId."
    );
  }

  const response = await axios.post(`${apiUrl}/wallets/${identifier}`, {
    keyId,
  });

  const turnkeySigner = new TurnkeySigner({
    apiPublicKey: publicKey,
    apiPrivateKey: privateKey,
    baseUrl: "https://coordinator-beta.turnkey.io",
    organizationId: keyId,
    privateKeyId: response.data.walletId,
  });
  return {
    getAddress: async () => (await turnkeySigner.getAddress()) as `0x${string}`,
    signMessage: async (msg: Uint8Array | string) =>
      (await turnkeySigner.signMessage(msg)) as `0x${string}`,
  };
}
