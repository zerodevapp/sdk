import { getWebAuthnAssertion } from "@turnkey/http/dist/webauthn";
import axios from "axios";
import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import { base64UrlEncode, generateRandomBuffer, signMessage, signTypedData } from "./utils.js";
import { API_URL } from "../../constants.js";

export async function getPasskeyOwner({projectId, apiUrl = API_URL}: {projectId: string, apiUrl?: string}  ): Promise<SmartAccountSigner | undefined> {
  const challenge = generateRandomBuffer();
  try {
    const assertion = JSON.parse(await getWebAuthnAssertion(base64UrlEncode(challenge)))
    const response = await axios.post(`${apiUrl}/projects/${projectId}/wallets/${assertion.credentialId}`, {
      challenge: base64UrlEncode(challenge),
      assertion
    })
    const { id, walletId, address } = await response.data
    const owner: SmartAccountSigner = {
      getAddress: async () => address,
      signMessage: (msg) => signMessage(msg, id, walletId, projectId, apiUrl),
      signTypedData: (params: SignTypedDataParams) => signTypedData(params, id, walletId, projectId, apiUrl)
    }
    return owner
  } catch(e) {
    console.log(e)
  }
  return
}