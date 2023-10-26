import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import { API_URL } from "../constants.js";
import axios from "axios";
import { TurnkeyClient } from "@turnkey/http";

/**
 * Params to get a custodial owner
 * Priv / pub key combo or custodial file path should be in different types
 */
type GetCustodialOwnerParams = {
  // ZeroDev api url
  apiUrl?: string;
  // Turnkey client (if the client want to reuse it
  turnKeyClient?: TurnkeyClient;

  // Direct access to priv / pub key
  privateKey?: string;
  publicKey?: string;
  keyId?: string;

  // Or read them from the custodial file path
  custodialFilePath?: string;
};

/**
 * Returns a signer for a custodial wallet via TurnKey
 */
export async function getCustodialOwner(
  identifier: string,
  {
    custodialFilePath,
    privateKey,
    publicKey,
    keyId,
    apiUrl = API_URL,
    turnKeyClient,
  }: GetCustodialOwnerParams
): Promise<SmartAccountSigner | undefined> {
  // Extract data from the custodial file path if provided
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
    // Override the values, if they are provided, to the one from the custodial file
    [privateKey, publicKey, keyId] = values;
  }

  // Ensure we have the required values
  if (!privateKey || !publicKey || !keyId) {
    throw new Error(
      "Must provide custodialFilePath or privateKey, publicKey, and keyId."
    );
  }

  // Get our turnkey client (build it if needed)
  if (!turnKeyClient) {
    // Try to fetch turnkey client & api key stamper
    let TurnkeyClient;
    let ApiKeyStamper;
    // TODO: Would be cleaner with something like radash and a tryit function?
    try {
      TurnkeyClient =
        require.resolve("@turnkey/http") &&
        require("@turnkey/http").TurnkeyClient;
      ApiKeyStamper =
        require.resolve("@turnkey/api-key-stamper") &&
        require("@turnkey/api-key-stamper").ApiKeyStamper;
    } catch (error) {
      console.log(
        "@turnkey/http or @turnkey/api-key-stamper module not available. Skipping FS operation..."
      );
      return;
    }

    // Build the turnkey client
    turnKeyClient = new TurnkeyClient(
      {
        baseUrl: "https://api.turnkey.com",
      },
      new ApiKeyStamper({
        apiPublicKey: publicKey,
        apiPrivateKey: privateKey,
      })
    );
  }

  // Get the wallet identifier from the API
  const response = await axios.post<any, { data: { walletId: string } }>(
    `${apiUrl}/wallets/${identifier}`,
    {
      keyId,
    }
  );

  // Build the turnkey viem account
  let createAccount;
  try {
    createAccount =
      require.resolve("@turnkey/viem") &&
      require("@turnkey/viem").createAccount;
  } catch (error) {
    console.log("@turnkey/viem module not available. Skipping FS operation...");
    return;
  }
  const turnkeySigner = await createAccount({
    client: turnKeyClient,
    organizationId: keyId,
    privateKeyId: response.data.walletId,
  });

  // Return an alchemy AA signer from the turnkey signer
  return {
    getAddress: async () => turnkeySigner.address,
    signMessage: async (msg: Uint8Array | string) => {
      if (typeof msg === "string") {
        // If the msg is a string, sign it directly
        return turnkeySigner.signMessage({ message: msg });
      } else {
        // Otherwise, sign the raw data
        return turnkeySigner.signMessage({ message: { raw: msg } });
      }
    },
    signTypedData: async (params: SignTypedDataParams) =>
      turnkeySigner.signTypedData(params),
  };
}
