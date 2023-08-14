import type { SmartAccountSigner } from "@alchemy/aa-core";
import { API_URL } from "../constants.js";
import axios from "axios";
import type { Hex } from "viem";
import type { SignTypedDataParams } from "@alchemy/aa-core";

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
    signTypedData: async (params: SignTypedDataParams) =>
      (await turnkeySigner.signTypedData(
        params.domain,
        params.types,
        params.message
      )) as Hex,
  };
}