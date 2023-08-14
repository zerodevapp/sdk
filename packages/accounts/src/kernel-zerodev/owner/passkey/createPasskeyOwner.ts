import { getWebAuthnAttestation } from "@turnkey/http";
import axios from "axios";
import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import { base64UrlEncode, es256, generateRandomBuffer, publicKey, signMessage, signTypedData } from "./utils.js";
import { API_URL } from "../../constants.js";
import { type TypedDataField } from "@ethersproject/abstract-signer";

export async function createPasskeyOwner({name, projectId, apiUrl = API_URL}: {name: string, projectId: string, apiUrl?: string}  ): Promise<SmartAccountSigner | undefined> {
  //@ts-expect-error
  if (typeof window !== 'undefined') {
    const challenge = generateRandomBuffer();
    const authenticatorUserId = generateRandomBuffer();
    try {
      const attestation = await getWebAuthnAttestation({
          publicKey: {
              rp: {
                  //@ts-expect-error
                  id: window.location.hostname,
                  name: "ZeroDev Passkey",
              },
              challenge,
              pubKeyCredParams: [
                  {
                  type: publicKey,
                  alg: es256,
                  },
              ],
              user: {
                  id: authenticatorUserId,
                  name,
                  displayName: name,
              },
          },
      });
      const response = await axios.post(`${apiUrl}/projects/${projectId}/wallets`, {
        challenge: base64UrlEncode(challenge),
        name,
        attestation
      })
      const {id, walletId, address} = await response.data
      const owner: SmartAccountSigner = {
        getAddress: async () => address,
        signMessage: (msg) => signMessage(msg, id, walletId, projectId, apiUrl),
        signTypedData: (params: SignTypedDataParams) => signTypedData(params, id, walletId, projectId, apiUrl)
      }
      return owner
    } catch(e) {
      console.log(e)
    }
  }
  return
}