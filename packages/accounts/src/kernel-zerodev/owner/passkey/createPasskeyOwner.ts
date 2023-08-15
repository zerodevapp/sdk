import { getWebAuthnAttestation } from "@turnkey/http";
import axios from "axios";
import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import { base64UrlEncode, es256, generateRandomBuffer, getCredentials, publicKey, signMessage, signTypedData } from "./utils.js";
import { API_URL } from "../../constants.js";

export async function createPasskeyOwner({name, projectId, fallback, apiUrl = API_URL}: {name: string, projectId: string, fallback?: () => Promise<SmartAccountSigner | undefined>, apiUrl?: string}  ): Promise<SmartAccountSigner | undefined> {
  //@ts-expect-error
  if (typeof window !== 'undefined') {
    const challenge = generateRandomBuffer();
    try {
      const attestation = await getWebAuthnAttestation({
          publicKey: {
              rp: {
                  //@ts-expect-error
                  id: window.location.hostname,
                  //@ts-expect-error
                  name: window.location.hostname,
              },
              authenticatorSelection: {
                residentKey: 'required',  // or 'preferred', 'discouraged'
                userVerification: 'required'
              },
              excludeCredentials: await getCredentials(projectId),
              extensions: { credProps: true },
              challenge,
              pubKeyCredParams: [
                  {
                  type: publicKey,
                  alg: es256,
                  },
              ],
              user: {
                  id: Uint8Array.from(name, c => c.charCodeAt(0)),
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
        signMessage: (msg) => signMessage(msg, id, walletId, projectId, attestation.credentialId, apiUrl),
        signTypedData: (params: SignTypedDataParams) => signTypedData(params, id, walletId, projectId, attestation.credentialId, apiUrl)
      }
      return owner
    } catch(e) {
      //@ts-expect-error
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        if (fallback) return await fallback()
      }
      console.log(e)
    }
  }
  return
}