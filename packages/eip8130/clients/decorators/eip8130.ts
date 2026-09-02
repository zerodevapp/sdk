import type { Abi, ContractFunctionName, Hash } from "viem"
import {
    type EstimateGasParameters,
    estimateGas
} from "../../actions/estimateGas.js"
import { getAccountStatus } from "../../actions/getAccountStatus.js"
import { type SendCallsParameters, sendCalls } from "../../actions/sendCalls.js"
import {
    type SendTransactionParameters,
    sendTransaction
} from "../../actions/sendTransaction.js"
import {
    type WriteContractParameters,
    writeContract
} from "../../actions/writeContract.js"
import type {
    KernelEip8130BaseClient,
    KernelEip8130Status
} from "../../types.js"
import {
    type WaitForTransactionReceiptParameters,
    type WaitForTransactionReceiptReturnType,
    waitForTransactionReceipt
} from "../../vendor/eip8130/index.js"

export type KernelEip8130Actions = {
    /** Keystore state for this Kernel and actor on the connected chain. */
    getAccountStatus: () => Promise<KernelEip8130Status>
    /** Gas for the calls as one EIP-8130 phase from the Kernel. */
    estimateGas: (args: EstimateGasParameters) => Promise<bigint>
    /** Sends the calls as one EIP-8130 transaction (payer-sponsored when the client has a payer). Returns the tx hash. */
    sendCalls: (args: SendCallsParameters) => Promise<Hash>
    /** Single-call form of `sendCalls`. */
    sendTransaction: (args: SendTransactionParameters) => Promise<Hash>
    /** Encodes and sends a contract write. */
    writeContract: <
        const abi extends Abi | readonly unknown[],
        functionName extends ContractFunctionName<abi, "nonpayable" | "payable">
    >(
        args: WriteContractParameters<abi, functionName>
    ) => Promise<Hash>
    /** Waits for the EIP-8130 receipt; check `receipt.eip8130.phaseStatuses` (or viem's `allPhasesSucceeded`) for per-phase results. */
    waitForTransactionReceipt: (
        args: WaitForTransactionReceiptParameters
    ) => Promise<WaitForTransactionReceiptReturnType>
}

export const kernelEip8130Actions =
    () =>
    (client: KernelEip8130BaseClient): KernelEip8130Actions => ({
        getAccountStatus: () => getAccountStatus(client),
        estimateGas: (args) => estimateGas(client, args),
        sendCalls: (args) => sendCalls(client, args),
        sendTransaction: (args) => sendTransaction(client, args),
        writeContract: (args) => writeContract(client, args),
        waitForTransactionReceipt: (args) =>
            waitForTransactionReceipt(client, args)
    })
