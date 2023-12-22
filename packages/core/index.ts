import { type Transport, type Chain, type Account, type Client, type Address, type Hex, type PublicClient } from "viem";
import type { SmartAccount } from "permissionless/accounts";
import { SponsorUserOperationMiddleware } from "permissionless/actions/smartAccount";
import type { UserOperation } from "permissionless";
import { BundlerClient, SmartAccountClient, createBundlerClient, createSmartAccountClient } from "permissionless";

interface PublicClientConfig {
    transport: Transport;
}

interface BundlerClientConfig {
    chain: Chain;
    transport: Transport;
}

interface SmartAccountClientConfig {
    account: SmartAccount;
    chain: Chain;
    transport: Transport;
    sponsorUserOperation?: SponsorUserOperationMiddleware;
}

interface PluginConfig {
    signer: Account;
    client: Client<Transport, Chain | undefined>;
    entryPoint: Address;
    getNonceKey: () => Promise<bigint>;
    getDummySignature: () => Promise<Hex>;
    signUserOperation: (UserOperation: UserOperation) => Promise<Hex>;
    getEnableData: () => Promise<Hex>;
}

export function getDefaultBundlerClient(chain: Chain, transport: Transport): BundlerClient {
    const config: BundlerClientConfig = {
        chain,
        transport,
    };
    return createBundlerClient(config);
}

// Utility function to create a SmartAccountClient with default configuration
export function getDefaultSmartAccountClient(
    account: SmartAccount,
    chain: Chain,
    transport: Transport,
    sponsorUserOperation?: SponsorUserOperationMiddleware
): SmartAccountClient {
    const config: SmartAccountClientConfig = {
        account,
        chain,
        transport,
        sponsorUserOperation,
    };

}

// Utility function to create a PublicClient with default configuration
export function getDefaultPublicClient(transport: Transport): PublicClient {
    const config: PublicClientConfig = {
        transport,
    };

}

export {
    createBundlerClient,
    createSmartAccountClient,
    type PublicClientConfig,
    type BundlerClientConfig,
    type SmartAccountClientConfig,
    type PluginConfig,
    type PublicClient,
    type BundlerClient,
    type SmartAccountClient,
};