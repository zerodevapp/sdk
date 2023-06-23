import type { ZeroDevProvider } from "../provider";
import { deepHexlify, type Hex, type UserOperationStruct, resolveProperties } from "@alchemy/aa-core";
import { ENTRYPOINT_ADDRESS } from "../constants";
import { toHex } from "viem";

export const withZeroDevGasEstimator = (
    provider: ZeroDevProvider
): ZeroDevProvider => {

    provider
        .withFeeDataGetter(async () => {
            const feeData = await provider.getFeeData()
            const maxFeePerGas = feeData?.maxFeePerGas ?? 0n;
            const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;
            return {
                maxFeePerGas,
                maxPriorityFeePerGas
            };
        })
        .withGasEstimator(async (struct) => {
            const callGasLimit = await provider.rpcClient.estimateGas({
                account: ENTRYPOINT_ADDRESS,
                to: await provider.account?.getAddress(),
                data: struct.callData as Hex
            })
            const initCode = await provider.account?.getInitCode();
            const initGas = await provider.estimateCreationGas(initCode);
            const partialStruct: UserOperationStruct = {
                ...struct,
                callGasLimit: initCode !== undefined && initCode.length > 2 ? BigInt("1000000") : callGasLimit,
                verificationGasLimit: BigInt(110000) + (initGas),
            }
            partialStruct.preVerificationGas = await provider.getPreVerificationGas(partialStruct)
            partialStruct.paymasterAndData = "0x"

            const request = deepHexlify(await resolveProperties(partialStruct));
            try {
                request.preVerificationGas = toHex(BigInt("100000"));
                request.verificationGasLimit = toHex(BigInt("1000000"));
                const { callGasLimit, preVerificationGas, verificationGasLimit } = await provider.rpcClient.estimateUserOperationGas(
                    request,
                    ENTRYPOINT_ADDRESS
                );
                request.preVerificationGas = preVerificationGas ? (BigInt(preVerificationGas) * 12n) / 10n : request.preVerificationGas
                request.verificationGasLimit = verificationGasLimit ? (BigInt(verificationGasLimit) * 12n) / 10n : request.verificationGasLimit
                request.callGasLimit = callGasLimit ?? request.callGasLimit
            } catch (error) {
                console.log(error)
            }

            return {
                ...struct,
                ...request,
            };
        });

    return provider;
}