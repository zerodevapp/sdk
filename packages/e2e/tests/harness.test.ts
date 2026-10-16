import { describe, expect, test } from "bun:test"
import { http, createPublicClient, zeroAddress, zeroHash } from "viem"
import { sepolia } from "viem/chains"
import { createEcdsaAccount, newOwner, randomIndex } from "../harness/accounts"
import { chainTime, increaseTime } from "../harness/anvil"
import { getKernelClient, getPublicClient } from "../harness/clients"
import { ALL_CHAINS, CHAINS } from "../harness/env"
import { falseOnRevert, isDeployed, isValid1271 } from "../harness/verify"

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

    test("isValid1271 on an undeployed account is false (no data, not an error)", async () => {
        expect(
            await isValid1271("sepolia", newOwner().address, zeroHash, "0x")
        ).toBeFalse()
    })

    test("falseOnRevert propagates transport errors instead of returning false", async () => {
        const dead = createPublicClient({
            chain: sepolia,
            transport: http("http://127.0.0.1:1", { retryCount: 0 })
        })
        await expect(
            falseOnRevert(dead.call({ to: zeroAddress }).then(() => true))
        ).rejects.toThrow()
    })
})
