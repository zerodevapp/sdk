import { browserInit, TurnkeyApi } from "@turnkey/http";
import axios from "axios";
import { API_URL } from "../../constants.js";
import type { Hex, Signature } from "./types.js";
import { ethers } from "ethers";
import type { SignTypedDataParams } from "@alchemy/aa-core";
import { hashTypedData } from "viem";

browserInit({
  baseUrl: "https://api.turnkey.com",
});

export const publicKey = "public-key";

export const es256 = -7;

export const generateRandomBuffer = (): ArrayBuffer => {
  const arr = new Uint8Array(32);
  //@ts-expect-error
  crypto.getRandomValues(arr);
  return arr.buffer;
};

export const base64UrlEncode = (challenge: ArrayBuffer): string => {
  return Buffer.from(challenge)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

// VIEM
// export function signatureToHex({ r, s, v }: Signature): Hex {
//     return `0x${new secp256k1.Signature(
//       hexToBigInt(r),
//       hexToBigInt(s),
//     ).toCompactHex()}${toHex(v).slice(2)}`
// }

//ETHERS
export function signatureToHex({ r, s, v }: Signature): Hex {
  return ethers.utils.joinSignature({
    r: `0x${r}`,
    s: `0x${s}`,
    //@ts-expect-error
    v: parseInt(v) + 27,
  }) as Hex;
}

export const signMessage = async (
  msg: string | Uint8Array,
  id: string,
  walletId: string,
  projectId: string,
  credentialId: string,
  apiUrl = API_URL
) => {
  const signedRequest = await TurnkeyApi.signSignRawPayload(
    {
      body: {
        type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD",
        organizationId: id,
        parameters: {
          privateKeyId: walletId,
          payload: ethers.utils.hashMessage(msg),
          encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
          hashFunction: "HASH_FUNCTION_NO_OP",
        },
        timestampMs: String(Date.now()),
      },
    },
    {
      publicKey: {
        allowCredentials: [
          {
            id: base64URLStringToBuffer(credentialId),
            type: publicKey,
          },
        ],
      },
    }
  );
  const proxyResponse = await axios.post(
    `${apiUrl}/projects/${projectId}/wallets/proxy`,
    {
      signedRequest,
    }
  );
  const { activity } = await proxyResponse.data;
  if (activity.status === "ACTIVITY_STATUS_COMPLETED") {
    let result = activity?.result?.signRawPayloadResult;

    if (result) {
      const assembled = signatureToHex(result);
      if (assembled) {
        return assembled;
      }
    }
  }
  return "0x";
};

export const signTypedData = async (
  params: SignTypedDataParams,
  id: string,
  walletId: string,
  projectId: string,
  credentialId: string,
  apiUrl = API_URL
) => {
  const hashToSign = hashTypedData(params);
  return await signMessage(
    hashToSign,
    id,
    walletId,
    projectId,
    credentialId,
    apiUrl
  );
};

export const getCredentials = async (projectId: string, apiUrl = API_URL) => {
  const response = await axios.get(`${apiUrl}/projects/${projectId}/wallets`);
  const credentials = response.data;
  return credentials.map((credential: string) => ({
    id: base64URLStringToBuffer(credential),
    type: "public-key",
  }));
};

// https://github.com/MasterKale/SimpleWebAuthn/blob/master/packages/browser/src/helpers/base64URLStringToBuffer.ts#L8
export function base64URLStringToBuffer(base64URLString: string): ArrayBuffer {
  // Convert from Base64URL to Base64
  const base64 = base64URLString.replace(/-/g, "+").replace(/_/g, "/");
  /**
   * Pad with '=' until it's a multiple of four
   * (4 - (85 % 4 = 1) = 3) % 4 = 3 padding
   * (4 - (86 % 4 = 2) = 2) % 4 = 2 padding
   * (4 - (87 % 4 = 3) = 1) % 4 = 1 padding
   * (4 - (88 % 4 = 0) = 4) % 4 = 0 padding
   */
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLength, "=");

  // Convert to a binary string
  const binary = atob(padded);

  // Convert binary string to buffer
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return buffer;
}
