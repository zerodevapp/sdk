import { createPublicErc4337FromClient, type HttpTransport, type PublicErc4337Client } from "@alchemy/aa-core";
import { http, createPublicClient, type Chain } from "viem";
import { BUNDLER_URL } from "../constants";

interface ZeroDevClientConfig {
    chain: Chain;
    rpcUrl: string;
    projectId: string;
}

export const createZeroDevPublicErc4337Client = ({
    chain,
    rpcUrl,
    projectId
}: ZeroDevClientConfig): PublicErc4337Client<HttpTransport> => {
    let client = createPublicErc4337FromClient(
        createPublicClient({
            chain,
            transport: http(rpcUrl, {
                fetchOptions: {
                    headers: rpcUrl === BUNDLER_URL ? { projectId } : {},
                },
                name: 'Connected bundler network',
                key: 'connected-bundler-network',
            }),
        })
    );

    return client;
};