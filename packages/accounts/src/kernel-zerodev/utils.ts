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
import { gasTokenChainAddresses } from "./constants.js";
import type { SupportedGasToken } from "./paymaster/types.js";

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
