import { expect, test } from "bun:test"
import { encodeFunctionData } from "viem"
import { entryPoint07Abi } from "viem/account-abstraction"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    createEcdsaAccount
} from "../../../harness/accounts"
import { getKernelClient } from "../../../harness/clients"
import { forEachKernelVersion } from "../../../harness/matrix"

const zeroFees = async () => ({ maxFeePerGas: 0n, maxPriorityFeePerGas: 0n })

forEachKernelVersion(KERNEL_V3_VERSIONS, (kernelVersion) => {
    test("a reverting call lands with success: false (zero-fee boost, no paymaster)", async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion
        })
        const client = getKernelClient(account, "sepolia", {
            paymaster: "none",
            estimateFeesPerGas: zeroFees
        })
        // withdrawTo more than the (zero) deposit reverts inside EntryPoint.
        const data = encodeFunctionData({
            abi: entryPoint07Abi,
            functionName: "withdrawTo",
            args: [account.address, 1n]
        })
        const hash = await client.sendUserOperation({
            calls: [{ to: ENTRY_POINT.address, value: 0n, data }],
            callGasLimit: 200_000n,
            verificationGasLimit: 1_500_000n,
            preVerificationGas: 100_000n
        })
        const receipt = await client.waitForUserOperationReceipt({ hash })
        expect(receipt.success).toBeFalse()
    })
})
