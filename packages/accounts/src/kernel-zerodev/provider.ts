import { type Address, type Chain, type HttpTransport, encodeFunctionData } from "viem";
import {
    type AccountMiddlewareFn,
    deepHexlify, resolveProperties,
    SmartAccountProvider,
    type SmartAccountProviderOpts,
    BaseSmartContractAccount,
    getChain,
    type UserOperationCallData,
    type BatchUserOperationCallData,
    type SendUserOperationResult,
    asyncPipe,
    noOpMiddleware,
    type UserOperationStruct,
    getUserOperationHash,
    type BytesLike
} from "@alchemy/aa-core";
import { isValidRequest } from "@alchemy/aa-core/src/types";
import { createZeroDevPublicErc4337Client } from "./client/create-client";
import { BUNDLER_URL, ERC20_ABI, ERC20_APPROVAL_AMOUNT } from "./constants";
import { getGasTokenAddress, type PaymasterConfig, type PaymasterPolicy } from "./middleware/types";
import { withZeroDevPaymasterAndData } from "./middleware/paymaster";
import type { KernelSmartContractAccount, UserOperationCallDataWithDelegate } from "./account";
import { defaultPaymasterConfig, middlewareClasses } from "./paymaster/types";
import type { AbstractPaymasterDataMiddleware } from "./paymaster/base";
import type { TokenPaymasterDataMiddleware } from "./paymaster/tokenPaymaster";


export type ZeroDevProviderConfig = {
    projectId: string;
    chain: Chain | number;
    entryPointAddress: Address;
    paymasterConfig?: PaymasterConfig<PaymasterPolicy>;
    rpcUrl?: string;
    account?: BaseSmartContractAccount;
    opts?: SmartAccountProviderOpts;
};

export class ZeroDevProvider extends SmartAccountProvider<HttpTransport> {

    private paymasterConfig: PaymasterConfig<PaymasterPolicy>;
    private paymaster: AbstractPaymasterDataMiddleware<PaymasterPolicy>;

    constructor({
        projectId,
        chain,
        entryPointAddress,
        paymasterConfig,
        rpcUrl = BUNDLER_URL,
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

        this.paymasterConfig = paymasterConfig ?? defaultPaymasterConfig;

        let middleware: AbstractPaymasterDataMiddleware<PaymasterPolicy>;

        if (this.paymasterConfig.policy === "VERIFYING_PAYMASTER") {
            let PaymasterClass = middlewareClasses.VERIFYING_PAYMASTER// as IPaymasterDataMiddlewareClass<"VERIFYING_PAYMASTER">;
            middleware = new PaymasterClass(this.paymasterConfig as PaymasterConfig<"VERIFYING_PAYMASTER">, { chainId: _chain.id, projectId });
        } else if (this.paymasterConfig.policy === "TOKEN_PAYMASTER") {
            let PaymasterClass = middlewareClasses.TOKEN_PAYMASTER// as IPaymasterDataMiddlewareClass<"TOKEN_PAYMASTER">;
            middleware = new PaymasterClass(this.paymasterConfig as PaymasterConfig<"TOKEN_PAYMASTER">, { chainId: _chain.id, projectId });
        } else {
            throw new Error(`Unsupported paymaster policy: ${this.paymasterConfig.policy}`);
        }
        this.paymaster = middleware;

        withZeroDevPaymasterAndData(this, this.paymasterConfig, { chainId: _chain.id, projectId });

    }

    sendUserOperation = async (
        data: UserOperationCallData | BatchUserOperationCallData,
        delegateCall: boolean = false
    ): Promise<SendUserOperationResult> => {
        if (!this.account) {
            throw new Error("account not connected!");
        }

        let callData: BytesLike = await this.getEncodedCallData(data, delegateCall);

        const initCode = await this.account.getInitCode();
        const uoStruct = await asyncPipe(
            this.dummyPaymasterDataMiddleware,
            this.gasEstimator,
            this.feeDataGetter,
            this.paymasterDataMiddleware,
            this.customMiddleware ?? noOpMiddleware
        )({
            initCode,
            sender: this.getAddress(),
            nonce: this.account.getNonce(),
            callData: callData,
            signature: this.account.getDummySignature(),
        } as UserOperationStruct);

        const request = deepHexlify(await resolveProperties(uoStruct));
        if (!isValidRequest(request)) {
            // this pretty prints the uo
            throw new Error(
                `Request is missing parameters. All properties on UserOperationStruct must be set. uo: ${JSON.stringify(
                    request,
                    null,
                    2
                )}`
            );
        }

        request.signature = (await this.account.signMessage(
            getUserOperationHash(
                request,
                this.entryPointAddress as `0x${string}`,
                BigInt(this.chain.id)
            )
        )) as `0x${string}`;

        return {
            hash: await this.rpcClient.sendUserOperation(
                request,
                this.entryPointAddress
            ),
            request,
        };
    };

    getEncodedCallData = async (
        data: UserOperationCallData | BatchUserOperationCallData,
        delegateCall: boolean = false
    ): Promise<BytesLike> => {

        let callData: BytesLike = "0x";
        if (!this.account) {
            throw new Error("account not connected!");
        }

        if (Array.isArray(data) && this.paymasterConfig.policy === "TOKEN_PAYMASTER") {
            const gasTokenAddress = getGasTokenAddress((this.paymasterConfig as PaymasterConfig<"TOKEN_PAYMASTER">).gasToken, this.paymaster.commonCfg.chainId);
            const paymasterAddress = await (this.paymaster as TokenPaymasterDataMiddleware).getPaymasterAddress();
            if (gasTokenAddress !== undefined && paymasterAddress !== undefined) {
                const approveData: UserOperationCallData = {
                    target: gasTokenAddress,
                    value: BigInt(0),
                    data: encodeFunctionData({
                        abi: ERC20_ABI,
                        functionName: "approve",
                        args: [paymasterAddress, ERC20_APPROVAL_AMOUNT[gasTokenAddress]],
                    })
                }
                callData = await this.account.encodeBatchExecute([approveData, ...data.map<UserOperationCallDataWithDelegate>((d) => ({ ...d, delegateCall: true }))]);
            }

        } else if (Array.isArray(data)) {
            callData = await this.account.encodeBatchExecute(data);
        } else if (delegateCall) {
            callData = await (this.account as KernelSmartContractAccount).encodeExecuteDelegate(data.target, data.value ?? 0n, data.data);
        } else {
            callData = await this.account.encodeExecute(data.target, data.value ?? 0n, data.data);
        }
        return callData;
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
