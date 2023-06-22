import { SmartAccountProvider, resolveProperties, type UserOperationStruct, type BigNumberish, BaseSmartContractAccount, type SmartAccountProviderOpts, getChain } from "@alchemy/aa-core";
import type { Address, Chain, Hex, HttpTransport } from "viem";
import { calcPreVerificationGas } from "../utils/calcPreverificationGas";
import { BUNDLER_URL, ENTRYPOINT_ADDRESS } from "../constants";
import { createZeroDevPublicErc4337Client } from "../client/create-client";
import type { PaymasterConfig, PaymasterPolicy } from "../middleware/types";
import type { AbstractPaymasterDataMiddleware } from "../paymaster/base";
import { defaultPaymasterConfig, middlewareClasses } from "../paymaster/types";

interface FeeData {
    maxFeePerGas: BigNumberish | null
    maxPriorityFeePerGas: BigNumberish | null
}

export abstract class BaseZeroDevProvider extends SmartAccountProvider<HttpTransport> {

    protected paymasterConfig: PaymasterConfig<PaymasterPolicy>;
    protected paymaster: AbstractPaymasterDataMiddleware<PaymasterPolicy>;

    constructor(
        projectId: string,
        chain: Chain | number,
        entryPointAddress: Address,
        rpcUrl: string = BUNDLER_URL,
        paymasterConfig?: PaymasterConfig<PaymasterPolicy>,
        account?: BaseSmartContractAccount,
        opts?: SmartAccountProviderOpts,
    ) {
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
            let PaymasterClass = middlewareClasses.VERIFYING_PAYMASTER;
            middleware = new PaymasterClass(this.paymasterConfig as PaymasterConfig<"VERIFYING_PAYMASTER">, { chainId: _chain.id, projectId });
        } else if (this.paymasterConfig.policy === "TOKEN_PAYMASTER") {
            let PaymasterClass = middlewareClasses.TOKEN_PAYMASTER;
            middleware = new PaymasterClass(this.paymasterConfig as PaymasterConfig<"TOKEN_PAYMASTER">, { chainId: _chain.id, projectId });
        } else {
            throw new Error(`Unsupported paymaster policy: ${this.paymasterConfig.policy}`);
        }
        this.paymaster = middleware;
    }

    async estimateCreationGas(initCode?: string): Promise<bigint> {
        if (initCode == null || initCode === '0x') return BigInt(0)
        const deployerAddress = initCode.substring(0, 42) as Hex
        const deployerCallData = '0x' + initCode.substring(42) as Hex
        return await this.rpcClient.estimateGas({ account: ENTRYPOINT_ADDRESS, to: deployerAddress, data: deployerCallData })
    }

    /**
    * should cover cost of putting calldata on-chain, and some overhead.
    * actual overhead depends on the expected bundle size
    */
    async getPreVerificationGas(userOp: Partial<UserOperationStruct>): Promise<number> {
        const p = await resolveProperties(userOp)
        return calcPreVerificationGas(p)
    }
    async getFeeData(): Promise<FeeData> {
        const { block, gasPrice } = await resolveProperties({
            block: this.rpcClient.getBlock({ blockTag: 'latest' }),
            gasPrice: this.rpcClient.getGasPrice().catch((error) => {
                console.warn('Failed to get gas price', error);
                return null
            })
        })

        let maxFeePerGas = null; let maxPriorityFeePerGas = null

        if (block && (block.baseFeePerGas != null)) {
            // Set the tip to the min of the tip for the last block and 1.5 gwei
            const minimumTip = BigInt('1500000000')
            maxPriorityFeePerGas = gasPrice ? (gasPrice - block.baseFeePerGas) : null
            if ((maxPriorityFeePerGas == null) || maxPriorityFeePerGas - BigInt(0) || maxPriorityFeePerGas > minimumTip) {
                maxPriorityFeePerGas = minimumTip
            }
            maxFeePerGas = block.baseFeePerGas * BigInt(2) + (maxPriorityFeePerGas ?? 0)
        }

        return { maxFeePerGas, maxPriorityFeePerGas }
    }
}