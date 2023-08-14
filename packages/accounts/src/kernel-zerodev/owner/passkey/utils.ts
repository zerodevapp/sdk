import { browserInit, TurnkeyApi } from "@turnkey/http";
import axios from "axios";
import { keccak256 } from "viem";
import { API_URL } from "../../constants.js";
import type { Hex, Signature } from './types.js';
import { ethers } from 'ethers'
import type { SignTypedDataParams } from "@alchemy/aa-core";
import { hashTypedData } from "viem";

browserInit({
    baseUrl: "https://coordinator-beta.turnkey.io",
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
        v: parseInt(v.toString()),
    }) as Hex;
}

export const signMessage = async (msg: string | Uint8Array, id: string, walletId: string, projectId: string, apiUrl = API_URL) => {

  const signedRequest = await TurnkeyApi.federatedPostSignRawPayload({
    body: {
      type: 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD',
      organizationId: id,
      parameters: {
        privateKeyId: walletId,
        payload: keccak256(msg as `0x${string}`),
        encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
        hashFunction: 'HASH_FUNCTION_NO_OP'
      },
      timestampMs: String(Date.now()),
    }
  })
  const proxyResponse = await axios.post(`${apiUrl}/projects/${projectId}/wallets/proxy`, {
    signedRequest
  })
  const { activity } = await proxyResponse.data
  if (activity.status === "ACTIVITY_STATUS_COMPLETED") {
    let result = activity?.result?.signRawPayloadResult;

    if (result) {
      const assembled = signatureToHex({
        r: `0x${result.r}`,
        s: `0x${result.s}`,
        v: result.v === "00" ? 27n : 28n,
      });
      if (assembled) {
        return assembled
      }

    }
  }
  return '0x'
}

export const signTypedData = async (params: SignTypedDataParams, id: string, walletId: string, projectId: string, apiUrl = API_URL) => {
  const hashToSign = hashTypedData(params)
  return await signMessage(hashToSign, id, walletId, projectId, apiUrl)
}