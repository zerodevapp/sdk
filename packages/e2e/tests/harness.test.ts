import { describe, expect, test } from "bun:test"
import { zeroAddress } from "viem"
import { createEcdsaAccount, newOwner, randomIndex } from "../harness/accounts"
import { chainTime, increaseTime } from "../harness/anvil"
import { getKernelClient, getPublicClient } from "../harness/clients"
import { ALL_CHAINS, CHAINS } from "../harness/env"
import { isDeployed } from "../harness/verify"

describe("harness", () => {
    for (const key of ALL_CHAINS) {
        test(`${key}: public client talks to the fork`, async () => {
            expect(await getPublicClient(key).getChainId()).toBe(
                CHAINS[key].chain.id
            )
        })

        test(`${key}: sponsored zero-fee userOp lands and deploys the account`, async () => {
            const { account } = await createEcdsaAccount({
                chain: key,
                kernelVersion: "0.3.3"
            })
            expect(await isDeployed(key, account.address)).toBeFalse()
            const client = getKernelClient(account, key)
            const hash = await client.sendUserOperation({
                calls: [{ to: zeroAddress, value: 0n, data: "0x" }]
            })
            const receipt = await client.waitForUserOperationReceipt({ hash })
            expect(receipt.success).toBeTrue()
            expect(await isDeployed(key, account.address)).toBeTrue()
        })
    }

    test("increaseTime moves chain time forward", async () => {
        const before = await chainTime("sepolia")
        await increaseTime("sepolia", 100)
        expect(await chainTime("sepolia")).toBeGreaterThanOrEqual(before + 100)
    })

    test("randomIndex and newOwner give fresh values", () => {
        expect(randomIndex()).not.toBe(randomIndex())
        expect(newOwner().address).not.toBe(newOwner().address)
    })
})
