import { describe, expect, test } from "bun:test"
import { RATE_LIMIT_POLICY_WITH_RESET_CONTRACT } from "@zerodev/permissions"
import { toRateLimitPolicy, toSudoPolicy } from "@zerodev/permissions/policies"
import { zeroAddress } from "viem"
import {
    chainTime,
    increaseTime,
    mine,
    syncClockToWall
} from "../../../../harness/anvil"
import type { KernelAccount } from "../../../../harness/clients"
import type { ChainKey } from "../../../../harness/env"
import {
    createSessionKeyAccount,
    sendCalls
} from "../../../../harness/permissions"

const POLICY_FAILED = /AA23 reverted 0x3e4983f6/ // PolicyFailed(uint256)
const RATE_LIMITED = /AA23 reverted 0x3f7b7a68/ // RateLimited()

const op = (account: KernelAccount, chain: ChainKey) =>
    sendCalls(account, [{ to: zeroAddress }], chain)
const sleep = (seconds: number) =>
    new Promise((resolve) => setTimeout(resolve, seconds * 1000))

// Default contract: each op is valid from startAt, then startAt moves on by
// interval; count is a lifetime total and never restored.
describe("rate limit (no reset)", () => {
    test("count is a lifetime total, not restored after the interval", async () => {
        const { account } = await createSessionKeyAccount({
            kernelVersion: "0.3.3",
            policies: [
                toSudoPolicy({}),
                toRateLimitPolicy({ count: 1, interval: 60 })
            ]
        })
        expect((await op(account, "sepolia")).success).toBeTrue()
        await expect(op(account, "sepolia")).rejects.toThrow(POLICY_FAILED)
        await increaseTime("sepolia", 61)
        await expect(op(account, "sepolia")).rejects.toThrow(POLICY_FAILED)
    })

    test("with startAt, each op waits one interval after the previous", async () => {
        await syncClockToWall("arbSepolia")
        const { account } = await createSessionKeyAccount({
            chain: "arbSepolia",
            kernelVersion: "0.3.3",
            policies: [
                toSudoPolicy({}),
                toRateLimitPolicy({
                    count: 2,
                    interval: 5,
                    startAt: await chainTime("arbSepolia")
                })
            ]
        })
        expect((await op(account, "arbSepolia")).success).toBeTrue()
        await expect(op(account, "arbSepolia")).rejects.toThrow(/AA22/)
        await sleep(6)
        await mine("arbSepolia")
        expect((await op(account, "arbSepolia")).success).toBeTrue()
        await expect(op(account, "arbSepolia")).rejects.toThrow(POLICY_FAILED)
    }, 60_000)
})

// Reset contract: count ops per interval, renewed once the interval has
// passed. It returns validAfter = now and validUntil = the window's end, and
// bundlers reject a validUntil less than 30 s away, so the interval is 40 s.
describe("rate limit with reset", () => {
    test("the allowance renews after the interval", async () => {
        await syncClockToWall("arbSepolia")
        const { account } = await createSessionKeyAccount({
            chain: "arbSepolia",
            kernelVersion: "0.3.3",
            policies: [
                toSudoPolicy({}),
                toRateLimitPolicy({
                    count: 1,
                    interval: 40,
                    policyAddress: RATE_LIMIT_POLICY_WITH_RESET_CONTRACT
                })
            ]
        })
        expect((await op(account, "arbSepolia")).success).toBeTrue()
        await expect(op(account, "arbSepolia")).rejects.toThrow(RATE_LIMITED)
        await sleep(41)
        // anvil only mines on demand; simulation uses the latest block's time.
        await mine("arbSepolia")
        expect((await op(account, "arbSepolia")).success).toBeTrue()
    }, 120_000)
})
