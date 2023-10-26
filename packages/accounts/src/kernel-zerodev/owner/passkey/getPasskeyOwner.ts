import { getWebAuthnAssertion } from "@turnkey/http/dist/webauthn";
import axios from "axios";
import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import {
  abortWebauthn,
  base64UrlEncode,
  generateRandomBuffer,
  getCredentials,
  signMessage,
  signTypedData,
} from "./utils.js";
import { API_URL } from "../../constants.js";

export async function getPasskeyOwner({
  projectId,
  name,
  apiUrl = API_URL,
  withCredentials = false,
}: {
  projectId: string;
  name?: string;
  apiUrl?: string;
  withCredentials?: boolean;
}): Promise<SmartAccountSigner | undefined> {
  if (typeof window !== "undefined") {
    const challenge = generateRandomBuffer();
    try {
      abortWebauthn();
      const assertion = JSON.parse(
        await getWebAuthnAssertion(base64UrlEncode(challenge), {
          publicKey: {
            rpId: window.location.hostname,
            userVerification: "required",
            allowCredentials: withCredentials
              ? await getCredentials(projectId, name)
              : undefined,
          },
        })
      );
      const response = await axios.post(
        `${apiUrl}/projects/${projectId}/wallets/${assertion.credentialId}`,
        {
          challenge: base64UrlEncode(challenge),
          assertion,
        }
      );
      const { id, walletId, address } = await response.data;
      const owner: SmartAccountSigner = {
        getAddress: async () => address,
        signMessage: (msg) =>
          signMessage(
            msg,
            id,
            walletId,
            projectId,
            assertion.credentialId,
            apiUrl
          ),
        signTypedData: (params: SignTypedDataParams) =>
          signTypedData(
            params,
            id,
            walletId,
            projectId,
            assertion.credentialId,
            apiUrl
          ),
      };
      return owner;
    } catch (e) {
      console.log(e);
    }
  }
  return;
}
