import { expect, test } from "bun:test"
import { createEcdsaAccount } from "../../../harness/accounts"
import { getKernelClient } from "../../../harness/clients"

test("getUserOperationGasPrice: zero on the sponsored route, real fees unsponsored", async () => {
    const { account } = await createEcdsaAccount({
        chain: "sepolia",
        kernelVersion: "0.3.3"
    })
    const sponsored = await getKernelClient(
        account,
        "sepolia"
    ).getUserOperationGasPrice()
    expect(sponsored.maxFeePerGas).toBe(0n)
    expect(sponsored.maxPriorityFeePerGas).toBe(0n)

    const unsponsored = await getKernelClient(account, "sepolia", {
        project: "unsponsored"
    }).getUserOperationGasPrice()
    expect(unsponsored.maxFeePerGas).toBeGreaterThan(0n)
})
