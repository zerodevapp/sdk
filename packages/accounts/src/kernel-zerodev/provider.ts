import type { Address, Chain, HttpTransport } from "viem";
import {
    type AccountMiddlewareFn,
    deepHexlify, resolveProperties,
    SmartAccountProvider,
    type SmartAccountProviderOpts,
    BaseSmartContractAccount,
    getChain
} from "@alchemy/aa-core";
import { createZeroDevPublicErc4337Client } from "./client/create-client";
import { BUNDLER_URL } from "./constants";


export type ZeroDevProviderConfig = {
    projectId: string;
    chain: Chain | number;
    entryPointAddress: Address;
    rpcUrl?: string;
    account?: BaseSmartContractAccount;
    opts?: SmartAccountProviderOpts;
};

export class ZeroDevProvider extends SmartAccountProvider<HttpTransport> {

    constructor({
        projectId,
        chain,
        rpcUrl = BUNDLER_URL,
        entryPointAddress,
        account,
        opts,
    }: ZeroDevProviderConfig) {
        const _chain = typeof chain === "number" ? getChain(chain) : chain;
        const rpcClient = createZeroDevPublicErc4337Client({
            chain: _chain,
            rpcUrl,
            projectId
        });

        super(rpcClient, entryPointAddress, _chain, account, opts);
    }

    gasEstimator: AccountMiddlewareFn = async (struct) => {
        const request = deepHexlify(await resolveProperties(struct));
        const estimates = await this.rpcClient.estimateUserOperationGas(
            request,
            this.entryPointAddress
        );

        estimates.verificationGasLimit =
            (BigInt(estimates.verificationGasLimit) * 130n) / 100n;

        return {
            ...struct,
            ...estimates,
        };
    };

    request: (args: { method: string; params?: any[] }) => Promise<any> = async (
        args
    ) => {
        const { method, params } = args;
        if (method === "personal_sign") {
            if (!this.account) {
                throw new Error("account not connected!");
            }
            const [data, address] = params!;
            if (address !== (await this.getAddress())) {
                throw new Error(
                    "cannot sign for address that is not the current account"
                );
            }
            // @ts-ignore
            return this.account.signWithEip6492(data);
        } else {
            return super.request(args)
        }
    };

}
