import { expect, test } from "bun:test"
import { encodeFunctionData } from "viem"
import { entryPoint07Abi } from "viem/account-abstraction"
import { ENTRY_POINT, createEcdsaAccount } from "../../../harness/accounts"
import { getKernelClient } from "../../../harness/clients"

const zeroFees = async () => ({ maxFeePerGas: 0n, maxPriorityFeePerGas: 0n })

test("a reverting call lands with success: false (zero-fee boost, no paymaster)", async () => {
    const { account } = await createEcdsaAccount({
        chain: "sepolia",
        kernelVersion: "0.3.3"
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
