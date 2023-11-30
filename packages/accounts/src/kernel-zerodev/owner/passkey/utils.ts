import { browserInit, TurnkeyApi } from "@turnkey/http";
import axios from "axios";
import { API_URL } from "../../constants.js";
import type { SignTypedDataParams } from "@alchemy/aa-core";
import { hashTypedData, signatureToHex, hashMessage } from "viem";

browserInit({
  baseUrl: "https://api.turnkey.com",
});

export const abortController = {
  controller: new AbortController(),
};

export function abortWebauthn() {
  abortController.controller.abort("ZeroDev: Reset previous Webauthn request");
  abortController.controller = new AbortController();
}

export const publicKey = "public-key";

export const es256 = -7;

export const generateRandomBuffer = (): ArrayBuffer => {
  const arr = new Uint8Array(32);
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

export const signMessageImplementation = async (
  msg: string,
  id: string,
  walletId: string,
  projectId: string,
  credentialId: string,
  apiUrl = API_URL
) => {
  abortWebauthn();
  const signedRequest = await TurnkeyApi.signSignRawPayload(
    {
      body: {
        type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
        organizationId: id,
        parameters: {
          signWith: walletId,
          payload: msg,
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
      const signatureHex = signatureToHex({
        r: `0x${result.r}`,
        s: `0x${result.s}`,
        v: result.v === "00" ? 27n : 28n,
      });
      if (signatureHex) {
        return signatureHex;
      }
    }
  }
  return "0x";
};

export const signMessage = async (
  msg: string | Uint8Array,
  id: string,
  walletId: string,
  projectId: string,
  credentialId: string,
  apiUrl = API_URL
) => {
  return await signMessageImplementation(
    hashMessage(typeof msg === "string" ? msg : { raw: msg }),
    id,
    walletId,
    projectId,
    credentialId,
    apiUrl
  );
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
  return await signMessageImplementation(
    hashToSign,
    id,
    walletId,
    projectId,
    credentialId,
    apiUrl
  );
};

export const getCredentials = async (
  projectId: string,
  name?: string,
  apiUrl = API_URL
) => {
  const url =
    `${apiUrl}/projects/${projectId}/wallets` + (name ? `/${name}` : "");
  const response = await axios.get(url);
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
