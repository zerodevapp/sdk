import { expect, test } from "bun:test"
import { zeroAddress } from "viem"
import { createEcdsaAccount } from "../../../harness/accounts"
import { getKernelClient } from "../../../harness/clients"

const call = { to: zeroAddress, value: 0n, data: "0x" } as const

test("ops on different custom nonce keys land in parallel", async () => {
    const { account } = await createEcdsaAccount({
        chain: "sepolia",
        kernelVersion: "0.3.3"
    })
    const client = getKernelClient(account, "sepolia")
    // Deploy first so the parallel ops do not both carry factory data.
    await client.waitForUserOperationReceipt({
        hash: await client.sendUserOperation({ calls: [call] })
    })

    const hashes = await Promise.all(
        [1n, 2n].map(async (key) =>
            client.sendUserOperation({
                calls: [call],
                nonce: await account.getNonce({ key })
            })
        )
    )
    const receipts = await Promise.all(
        hashes.map((hash) => client.waitForUserOperationReceipt({ hash }))
    )
    expect(receipts.every((r) => r.success)).toBeTrue()
    expect(new Set(receipts.map((r) => r.nonce)).size).toBe(2)
})
