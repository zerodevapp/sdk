import type { ZeroDevProvider } from "../provider";
import { deepHexlify, type Hex, type UserOperationStruct, resolveProperties, type BigNumberish, type UserOperationEstimateGasResponse } from "@alchemy/aa-core";
import { ENTRYPOINT_ADDRESS } from "../constants";
import { toHex } from "viem";
import { calcPreVerificationGas } from "../utils/calc-pre-verification-gas";

export const withZeroDevGasEstimator = (
    provider: ZeroDevProvider
): ZeroDevProvider => {

    provider.withFeeDataGetter(async () => {
        try {
            let { maxFeePerGas, maxPriorityFeePerGas } = await eip1559GasPrice(provider);
            return {
                maxFeePerGas,
                maxPriorityFeePerGas
            };
        } catch (error: any) {
            console.warn(
                "getGas: eth_maxPriorityFeePerGas failed, falling back to legacy gas price."
            );
        }

        const feeData = await getFeeData(provider);
        const maxFeePerGas = feeData?.maxFeePerGas ? BigInt(feeData?.maxFeePerGas) : 0n;
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? BigInt(feeData.maxPriorityFeePerGas) : 0n;
        return { maxFeePerGas, maxPriorityFeePerGas };
    });

    provider.withGasEstimator(async (struct) => {
        if (struct.callGasLimit !== undefined && struct.verificationGasLimit !== undefined && struct.preVerificationGas !== undefined) {
            return struct;
        }
        const initCode = await provider.account?.getInitCode();
        const initGas = await estimateCreationGas(provider, initCode);
        const partialStruct: UserOperationStruct = {
            ...struct,
            callGasLimit: initCode !== undefined && initCode.length > 2 ? BigInt("1000000") : BigInt(40000),
            verificationGasLimit: BigInt(110000) + (initGas),
        };

        partialStruct.preVerificationGas = await getPreVerificationGas(partialStruct);

        const request = deepHexlify(await resolveProperties(partialStruct));
        let userOpGasEstimates: UserOperationEstimateGasResponse | undefined;
        try {
            request.preVerificationGas = toHex(BigInt("100000"));
            request.verificationGasLimit = toHex(BigInt("1000000"));
            request.callGasLimit = toHex(BigInt("55000"));
            userOpGasEstimates = await provider.rpcClient.estimateUserOperationGas(
                request,
                ENTRYPOINT_ADDRESS
            );
            const { preVerificationGas, verificationGasLimit, callGasLimit } = userOpGasEstimates;
            request.preVerificationGas = preVerificationGas ? (BigInt(preVerificationGas) * 12n) / 10n : request.preVerificationGas;
            request.verificationGasLimit = verificationGasLimit ? (BigInt(verificationGasLimit) * 12n) / 10n : request.verificationGasLimit;
            request.callGasLimit = callGasLimit ? (BigInt(callGasLimit) * 12n) / 10n : request.callGasLimit;
        } catch (error) {
            console.log(error);
        }

        return {
            ...struct,
            ...request,
        };
    });

    return provider;
};

export const estimateCreationGas = async (provider: ZeroDevProvider, initCode?: string): Promise<bigint> => {
    if (initCode == null || initCode === '0x') return BigInt(0);
    const deployerAddress = initCode.substring(0, 42) as Hex;
    const deployerCallData = '0x' + initCode.substring(42) as Hex;
    return await provider.rpcClient.estimateGas({ account: ENTRYPOINT_ADDRESS, to: deployerAddress, data: deployerCallData });
};

/**
* should cover cost of putting calldata on-chain, and some overhead.
* actual overhead depends on the expected bundle size
*/
export const getPreVerificationGas = async (userOp: Partial<UserOperationStruct>): Promise<number> => {
    const p = await resolveProperties(userOp);
    return calcPreVerificationGas(p);
};

export const eip1559GasPrice = async (provider: ZeroDevProvider) => {
    const [fee, block] = await Promise.all([
        provider.rpcClient.getMaxPriorityFeePerGas(),
        provider.rpcClient.getBlock({ blockTag: 'latest' }),
    ]);

    const tip = BigInt(fee);
    const buffer = (tip / (100n)) * (13n);
    let maxPriorityFeePerGas = tip + (buffer);
    maxPriorityFeePerGas = maxPriorityFeePerGas < provider.minPriorityFeePerBid ? provider.minPriorityFeePerBid : maxPriorityFeePerGas;
    const maxFeePerGas = block.baseFeePerGas
        ? (BigInt(block.baseFeePerGas) * (2n)) + (maxPriorityFeePerGas)
        : maxPriorityFeePerGas;

    return { maxFeePerGas, maxPriorityFeePerGas };
};
interface FeeData {
    maxFeePerGas: BigNumberish | null;
    maxPriorityFeePerGas: BigNumberish | null;
}

export const getFeeData = async (provider: ZeroDevProvider): Promise<FeeData> => {
    const { block, gasPrice } = await resolveProperties({
        block: provider.rpcClient.getBlock({ blockTag: 'latest' }),
        gasPrice: provider.rpcClient.getGasPrice().catch((error) => {
            console.warn('Legacy: Failed to get gas price', error);
            return null;
        })
    });

    let maxFeePerGas = null; let maxPriorityFeePerGas = null;

    if (block && (block.baseFeePerGas != null)) {
        // Set the tip to the min of the tip for the last block and 1.5 gwei
        const minimumTip = BigInt('1500000000');
        maxPriorityFeePerGas = gasPrice ? (gasPrice - block.baseFeePerGas) : null;
        if ((maxPriorityFeePerGas == null) || maxPriorityFeePerGas - BigInt(0) || maxPriorityFeePerGas > minimumTip) {
            maxPriorityFeePerGas = minimumTip;
        }
        maxPriorityFeePerGas = maxPriorityFeePerGas < provider.minPriorityFeePerBid  ? provider.minPriorityFeePerBid : maxPriorityFeePerGas;
        maxFeePerGas = block.baseFeePerGas * BigInt(2) + (maxPriorityFeePerGas ?? 0);
    }

    return { maxFeePerGas, maxPriorityFeePerGas };
};