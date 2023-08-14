import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import { Web3Provider, type ExternalProvider } from "@ethersproject/providers";
import { type TypedDataField } from "@ethersproject/abstract-signer";
import type { Hex } from "viem";

export function getRPCProviderOwner(web3Provider: any): SmartAccountSigner {
  const provider = new Web3Provider(web3Provider as ExternalProvider);
  const signer = provider.getSigner();

  return {
    getAddress: async () =>
      Promise.resolve((await signer.getAddress()) as `0x${string}`),
    signMessage: async (msg: Uint8Array | string) =>
      (await signer.signMessage(msg)) as `0x${string}`,
    signTypedData: async (params: SignTypedDataParams) =>
      (await signer._signTypedData(
        params.domain!,
        params.types as unknown as Record<string, TypedDataField[]>,
        params.message
      )) as Hex,
  };
}