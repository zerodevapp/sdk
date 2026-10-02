import { describe, expect, test } from "bun:test"
import { toSudoPolicy, toTimestampPolicy } from "@zerodev/permissions/policies"
import { zeroAddress } from "viem"
import { chainTime, increaseTime } from "../../../../harness/anvil"
import {
    createSessionKeyAccount,
    sendCalls
} from "../../../../harness/permissions"

describe("timestamp policy", () => {
    // UR rejects not-yet-valid ops against its own wall clock
    // (UnsafeValidator: validAfter > Date.now()), while the EntryPoint checks
    // block time. Earlier tests may have moved chain time ahead of the wall
    // clock, so take the earlier/later of the two.
    const wallClock = () => Math.floor(Date.now() / 1000)

    test("validAfter in the future is rejected", async () => {
        const later = Math.max(await chainTime("sepolia"), wallClock())
        const { account } = await createSessionKeyAccount({
            kernelVersion: "0.3.3",
            policies: [
                toSudoPolicy({}),
                toTimestampPolicy({ validAfter: later + 3600 })
            ]
        })
        await expect(
            sendCalls(account, [{ to: zeroAddress }])
        ).rejects.toThrow()
    })

    test("validAfter in the past is accepted", async () => {
        const earlier = Math.min(await chainTime("sepolia"), wallClock())
        const { account } = await createSessionKeyAccount({
            kernelVersion: "0.3.3",
            policies: [
                toSudoPolicy({}),
                toTimestampPolicy({ validAfter: earlier - 60 })
            ]
        })
        expect(
            (await sendCalls(account, [{ to: zeroAddress }])).success
        ).toBeTrue()
    })

    test("validUntil in the past is rejected", async () => {
        const now = await chainTime("sepolia")
        const { account } = await createSessionKeyAccount({
            kernelVersion: "0.3.3",
            policies: [
                toSudoPolicy({}),
                toTimestampPolicy({ validUntil: now + 60 })
            ]
        })
        await increaseTime("sepolia", 120)
        await expect(
            sendCalls(account, [{ to: zeroAddress }])
        ).rejects.toThrow()
    })
})
