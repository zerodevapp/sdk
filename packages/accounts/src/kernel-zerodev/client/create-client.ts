import { createPublicErc4337FromClient, type HttpTransport, type PublicErc4337Client } from "@alchemy/aa-core";
import { http, createPublicClient, type Chain } from "viem";


export const createZeroDevPublicErc4337Client = ({
    chain,
    rpcUrl,
    projectId
}: {
    chain: Chain;
    rpcUrl: string;
    projectId: string;
}): PublicErc4337Client<HttpTransport> => {
    let client = createPublicErc4337FromClient(
        createPublicClient({
            chain,
            transport: http(rpcUrl, {
                fetchOptions: {
                    headers: {
                        projectId,
                    },
                },
                name: 'Connected bundler network',
                key: 'connected-bundler-network',
            }),
        })
    );

    return client;
};