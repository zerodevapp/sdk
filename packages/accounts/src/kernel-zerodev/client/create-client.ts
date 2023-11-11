import {
  createPublicErc4337FromClient,
  type PublicErc4337Client,
  type Erc337RpcSchema,
  type HttpTransport,
} from "@alchemy/aa-core";
import { http, createPublicClient, type Chain, custom } from "viem";
import { BUNDLER_URL, CHAIN_ID_TO_NODE } from "../constants.js";
import type { PaymasterAndBundlerProviders } from "../paymaster/types.js";

interface ZeroDevClientConfig {
  chain: Chain;
  projectId: string;
  rpcUrl?: string;
  bundlerProvider?: PaymasterAndBundlerProviders;
}

type MethodsOfErc4337RpcSchema = Erc337RpcSchema[number]["Method"];

function isMethodInErc4337RpcSchema(
  variable: string
): variable is MethodsOfErc4337RpcSchema {
  return (
    [
      "eth_sendUserOperation",
      "eth_estimateUserOperationGas",
      "eth_getUserOperationReceipt",
      "eth_getUserOperationByHash",
      "eth_supportedEntryPoints",
      "eth_maxPriorityFeePerGas",
      "rundler_maxPriorityFeePerGas",
      "pimlico_getUserOperationGasPrice",
    ] as const
  ).includes(variable as MethodsOfErc4337RpcSchema);
}

export const createZeroDevPublicErc4337Client = ({
  chain,
  rpcUrl,
  projectId,
  bundlerProvider,
}: ZeroDevClientConfig): PublicErc4337Client<HttpTransport> => {
  const erc4337Transport = http(rpcUrl, {
    fetchOptions: {
      // @ts-ignore
      headers: rpcUrl === BUNDLER_URL ? { projectId, bundlerProvider } : {},
    },
    name: "Connected bundler network",
    key: "connected-bundler-network",
    retryCount: 0,
    timeout: 35000,
  });
  const publicTransport = http(CHAIN_ID_TO_NODE[chain.id]);
  let client = createPublicErc4337FromClient(
    createPublicClient({
      chain,
      transport: custom({
        async request({ method, params }) {
          let response;
          if (isMethodInErc4337RpcSchema(method)) {
            response = await erc4337Transport({ chain }).request({
              method,
              params,
            } as any);
          } else {
            response = await publicTransport({ chain }).request({
              method,
              params,
            } as any);
          }
          return response;
        },
      }),
    })
  );

  return client as unknown as PublicErc4337Client<HttpTransport>;
};
