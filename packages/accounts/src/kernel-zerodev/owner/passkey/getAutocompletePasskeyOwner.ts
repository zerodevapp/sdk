import { getWebAuthnAssertion } from "@turnkey/http/dist/webauthn";
import axios from "axios";
import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import {
  abortController,
  abortWebauthn,
  base64UrlEncode,
  generateRandomBuffer,
  signMessage,
  signTypedData,
} from "./utils.js";
import { API_URL } from "../../constants.js";

export async function getAutocompletePasskeyOwner({
  projectId,
  apiUrl = API_URL,
}: {
  projectId: string;
  name?: string;
  apiUrl?: string;
}): Promise<SmartAccountSigner | undefined> {
  if (
    //@ts-ignore
    !PublicKeyCredential?.isConditionalMediationAvailable ||
    //@ts-ignore
    !PublicKeyCredential?.isConditionalMediationAvailable()
  ) {
    return;
  }

  if (typeof window !== "undefined") {
    const challenge = generateRandomBuffer();
    try {
      abortWebauthn();
      const assertion = JSON.parse(
        await getWebAuthnAssertion(base64UrlEncode(challenge), {
          mediation: "conditional",
          publicKey: {
            rpId: window.location.hostname,
            userVerification: "required",
          },
          signal: abortController.controller.signal,
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
      console.log("owner", id, walletId, address);
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
