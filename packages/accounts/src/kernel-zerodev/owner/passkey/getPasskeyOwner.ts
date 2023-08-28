import { getWebAuthnAssertion } from "@turnkey/http/dist/webauthn";
import axios from "axios";
import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import {
  base64UrlEncode,
  generateRandomBuffer,
  signMessage,
  signTypedData,
} from "./utils.js";
import { API_URL } from "../../constants.js";

export async function getPasskeyOwner({
  projectId,
  apiUrl = API_URL,
}: {
  projectId: string;
  apiUrl?: string;
}): Promise<SmartAccountSigner | undefined> {
  //@ts-expect-error
  if (typeof window !== "undefined") {
    const challenge = generateRandomBuffer();
    try {
      const assertion = JSON.parse(
        await getWebAuthnAssertion(base64UrlEncode(challenge), {
          publicKey: {
            //@ts-expect-error
            rpId: window.location.hostname,
            userVerification: "required",
            // allowCredentials: await getCredentials(projectId),
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
