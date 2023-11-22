import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import { API_URL } from "../constants.js";
import axios from "axios";
import { memo, tryit } from "radash";

/**
 * Params to get a custodial owner
 * Priv / pub key combo or custodial file path should be in different types
 */
type GetCustodialOwnerParams = Readonly<{
  // ZeroDev api url
  apiUrl?: string;
  // Turnkey client (if the client want to reuse it
  turnKeyClient?: unknown;

  // Direct access to priv / pub key
  privateKey?: string;
  publicKey?: string;
  keyId?: string;

  // Or read them from the custodial file path
  custodialFilePath?: string;
}>;

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
    [privateKey, publicKey, keyId] = await loadSignDataFromCustodialFile(
      custodialFilePath
    );
  }

  // Ensure we have the required values
  if (!keyId) {
    throw new Error("You must provide custodialFilePath or a keyId.");
  }

  // Get our turnkey client (build it if needed)
  let ensuredTurnkeyClient = turnKeyClient;
  if (!ensuredTurnkeyClient && privateKey && publicKey) {
    ensuredTurnkeyClient = await getDefaultTurnkeyClient({
      privateKey,
      publicKey,
    });
  } else {
    throw new Error(
      "No turnkey client available, if you don't provide one you should provide private and public key or a custodial file path"
    );
  }

  // Get the wallet identifier from the API
  const response = await fetchWallet({ identifier, keyId, apiUrl });
  if (!response?.data?.walletId) {
    throw new Error(`No wallet id found for ${identifier}`);
  }

  // Build the turnkey viem account
  const turnkeySigner = await getTurnkeySigner({
    keyId,
    privateKeyId: response.data.walletId,
    turnkeyClient: ensuredTurnkeyClient,
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

/**
 * Try to load sign data from a local custodial file path
 */
const loadSignDataFromCustodialFile = memo(
  async (custodialFilePath: string) => {
    const [, fsModule] = await tryit(() => import("fs"))();
    if (!fsModule) {
      console.error("FS module not available");
      throw new Error(
        "FS module not available, you must provide each keys or install this module"
      );
    }
    const data = fsModule.readFileSync(custodialFilePath, "utf8");
    return data.split("\n");
  },
  {
    // TTL of 1min in the memory cache
    ttl: 1000 * 60,
    // The key in the cache
    key: (custodialFilePath: string) => `${custodialFilePath}`,
  }
);

/**
 * Get our default turnkey client
 */
const getDefaultTurnkeyClient = memo(
  async ({
    privateKey,
    publicKey,
  }: {
    privateKey: string;
    publicKey: string;
  }) => {
    // Try to fetch turnkey client & api key stamper
    const [, turnkeyHttp] = await tryit(() => import("@turnkey/http"))();
    const [, turnkeyApiKeyStamper] = await tryit(
      () => import("@turnkey/api-key-stamper")
    )();
    if (!turnkeyHttp || !turnkeyApiKeyStamper) {
      console.error(
        "@turnkey/http or @turnkey/api-key-stamper module not available."
      );
      throw new Error(
        "Turnkey http or api-key-stamper modules not available, you must provide a turnkey client or install this modules"
      );
    }

    // Build the turnkey client
    return new turnkeyHttp.TurnkeyClient(
      {
        baseUrl: "https://api.turnkey.com",
      },
      new turnkeyApiKeyStamper.ApiKeyStamper({
        apiPublicKey: publicKey,
        apiPrivateKey: privateKey,
      })
    );
  },
  {
    // TTL of 1min in the memory cache
    ttl: 1000 * 60,
    // The key in the cache
    key: ({
      privateKey,
      publicKey,
    }: {
      privateKey: string;
      publicKey: string;
    }) => `${privateKey}-${publicKey}`,
  }
);

/**
 * Simple function used to fetch the wallet id from the API using an identifier
 */
const fetchWallet = memo(
  ({
    identifier,
    keyId,
    apiUrl,
  }: {
    identifier: string;
    keyId: string;
    apiUrl: string;
  }) => {
    return axios.post<any, { data: { walletId: string } }>(
      `${apiUrl}/wallets/${identifier}`,
      {
        keyId,
      }
    );
  },
  {
    // TTL of 1min in the memory cache
    ttl: 1000 * 60,
    // The key in the cache
    key: ({
      identifier,
      keyId,
      apiUrl,
    }: {
      identifier: string;
      keyId: string;
      apiUrl: string;
    }) => `${identifier}-${keyId}-${apiUrl}`,
  }
);

/**
 * Get a turnkey signer
 */
const getTurnkeySigner = memo(
  async ({
    keyId,
    privateKeyId,
    turnkeyClient,
  }: {
    keyId: string;
    privateKeyId: string;
    turnkeyClient: unknown;
  }) => {
    // Get the turnkey viem account
    const [, turnkeyViem] = await tryit(() => import("@turnkey/viem"))();
    if (!turnkeyViem) {
      console.error("@turnkey/viem module not available");
      throw new Error(
        "Turnkey viem module not available, can't create a turnkey signer for the custodial owner"
      );
    }
    return turnkeyViem.createAccount({
      client: turnkeyClient as any,
      organizationId: keyId,
      privateKeyId,
    });
  },
  {
    // TTL of 1min in the memory cache
    ttl: 1000 * 60,
    // The key in the cache
    key: ({
      keyId,
      privateKeyId,
    }: {
      keyId: string;
      privateKeyId: string;
      turnkeyClient: unknown;
    }) => `${keyId}-${privateKeyId}`,
  }
);
