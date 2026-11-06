import { describe, expect, test } from "bun:test"
import { toSudoPolicy, toTimestampPolicy } from "@zerodev/permissions/policies"
import { zeroAddress } from "viem"
import { chainTime, increaseTime } from "../../../../harness/anvil"
import { rpcErrorDetails } from "../../../../harness/errors"
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
        expect(
            await rpcErrorDetails(sendCalls(account, [{ to: zeroAddress }]))
        ).toMatch(/AA22 expired or not due|User operation is not valid yet/)
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

    test("validUntil: accepted before the deadline, rejected as expired after it", async () => {
        // The deadline must be in the future for both clocks: UR checks
        // validUntil against its wall clock, the EntryPoint against block time.
        const deadline = Math.max(await chainTime("sepolia"), wallClock()) + 600
        const { account } = await createSessionKeyAccount({
            kernelVersion: "0.3.3",
            policies: [
                toSudoPolicy({}),
                toTimestampPolicy({ validUntil: deadline })
            ]
        })
        expect(
            (await sendCalls(account, [{ to: zeroAddress }])).success
        ).toBeTrue()

        await increaseTime(
            "sepolia",
            deadline - (await chainTime("sepolia")) + 60
        )
        expect(await chainTime("sepolia")).toBeGreaterThan(deadline)
        expect(
            await rpcErrorDetails(sendCalls(account, [{ to: zeroAddress }]))
        ).toMatch(/AA22 expired/)
    })
})
