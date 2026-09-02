import {
    type Abi,
    type Address,
    type ContractFunctionName,
    type EncodeFunctionDataParameters,
    type Hash,
    encodeFunctionData
} from "viem"
import type { KernelEip8130BaseClient } from "../types.js"
import type { SendCallsParameters } from "./sendCalls.js"
import { sendTransaction } from "./sendTransaction.js"

export type WriteContractParameters<
    abi extends Abi | readonly unknown[] = Abi,
    functionName extends ContractFunctionName<
        abi,
        "nonpayable" | "payable"
    > = ContractFunctionName<abi, "nonpayable" | "payable">
> = EncodeFunctionDataParameters<abi, functionName> &
    Omit<SendCallsParameters, "calls"> & {
        address: Address
        value?: bigint
    }

/** Encodes and sends a contract write from the Kernel over EIP-8130. */
export function writeContract<
    const abi extends Abi | readonly unknown[],
    functionName extends ContractFunctionName<abi, "nonpayable" | "payable">
>(
    client: KernelEip8130BaseClient,
    {
        abi,
        functionName,
        args,
        address,
        value,
        ...rest
    }: WriteContractParameters<abi, functionName>
): Promise<Hash> {
    const data = encodeFunctionData({
        abi,
        functionName,
        args
    } as EncodeFunctionDataParameters)
    return sendTransaction(client, { to: address, data, value, ...rest })
}
