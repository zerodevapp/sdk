import type { ZeroDevProvider } from "../provider";
import { deepHexlify, type Hex, type UserOperationStruct, resolveProperties } from "@alchemy/aa-core";
import { ENTRYPOINT_ADDRESS } from "../constants";

export const withZeroDevGasEstimator = (
    provider: ZeroDevProvider
): ZeroDevProvider => {

    provider.withGasEstimator(async (struct) => {
        const callGasLimit = await provider.rpcClient.estimateGas({
            account: ENTRYPOINT_ADDRESS,
            to: await provider.account?.getAddress(),
            data: struct.callData as Hex
        })
        const feeData = provider.getFeeData()
        const initCode = await provider.account?.getInitCode();
        const initGas = await provider.estimateCreationGas(initCode);
        const partialStruct: UserOperationStruct = {
            ...struct,
            callGasLimit: initCode !== undefined && initCode.length > 2 ? BigInt('1000000') : callGasLimit,
            maxFeePerGas: (feeData != null) ? ((await feeData).maxFeePerGas ?? undefined) : struct.maxFeePerGas,
            maxPriorityFeePerGas: (feeData != null) ? ((await feeData).maxPriorityFeePerGas ?? undefined) : struct.maxPriorityFeePerGas,
            verificationGasLimit: BigInt(110000) + (initGas),
            signature: "0x4046ab7d9c387d7a5ef5ca0777eded29767fd9863048946d35b3042d2f7458ff7c62ade2903503e15973a63a296313eab15b964a18d79f4b06c8c01c7028143c1c"
        }
        partialStruct.preVerificationGas = await provider.getPreVerificationGas(partialStruct)
        partialStruct.paymasterAndData = '0x'

        const request = deepHexlify(await resolveProperties(partialStruct));
        const estimates = await provider.rpcClient.estimateUserOperationGas(
            request,
            ENTRYPOINT_ADDRESS
        );

        estimates.verificationGasLimit =
            (BigInt(estimates.verificationGasLimit) * 130n) / 100n;

        return {
            ...struct,
            ...request,
            signature: ''
        };
    });

    return provider;
}