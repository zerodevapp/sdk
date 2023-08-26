import type { SmartAccountSigner } from "@alchemy/aa-core";
import { API_URL } from "../../constants.js";
// import { getPasskeyOwner } from "./getPasskeyOwner.js";
import { createPasskeyOwner } from "./createPasskeyOwner.js";
import { getPasskeyOwner } from "./getPasskeyOwner.js";

export async function getOrCreatePasskeyOwner({
  name,
  projectId,
  apiUrl = API_URL,
}: {
  name: string;
  projectId: string;
  apiUrl?: string;
}): Promise<SmartAccountSigner | undefined> {
  return await createPasskeyOwner({
    name,
    projectId,
    apiUrl,
    fallback: () => getPasskeyOwner({ projectId, apiUrl }),
  });
}
