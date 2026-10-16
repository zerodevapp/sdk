import { expect, test } from "bun:test"
import { toRateLimitPolicy, toSudoPolicy } from "@zerodev/permissions/policies"
import { zeroAddress } from "viem"
import {
    createSessionKeyAccount,
    sendCalls
} from "../../../../harness/permissions"

test("rate limit: count 1 per hour allows one op and rejects the next", async () => {
    const { account } = await createSessionKeyAccount({
        kernelVersion: "0.3.3",
        policies: [
            toSudoPolicy({}),
            toRateLimitPolicy({ count: 1, interval: 3600 })
        ]
    })
    expect((await sendCalls(account, [{ to: zeroAddress }])).success).toBeTrue()
    await expect(sendCalls(account, [{ to: zeroAddress }])).rejects.toThrow(
        /AA23/
    )
})
