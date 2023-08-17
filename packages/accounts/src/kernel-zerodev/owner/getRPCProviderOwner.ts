import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import { Web3Provider, type ExternalProvider } from "@ethersproject/providers";
import { hashTypedData, type Hex } from "viem";
import { fixSignedData } from "../utils.js";

export function getRPCProviderOwner(web3Provider: any): SmartAccountSigner {
  const provider = new Web3Provider(web3Provider as ExternalProvider);
  const signer = provider.getSigner();

  return {
    getAddress: async () =>
      Promise.resolve((await signer.getAddress()) as `0x${string}`),
    signMessage: async (msg: Uint8Array | string) =>
      (await signer.signMessage(msg)) as `0x${string}`,
    signTypedData: async (params: SignTypedDataParams) => {
      const hash = hashTypedData(params);
      return fixSignedData((await signer.signMessage(hash)) as Hex);
    },
  };
}
