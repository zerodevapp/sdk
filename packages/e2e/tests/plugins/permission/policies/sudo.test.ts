import { expect, test } from "bun:test"
import { toSudoPolicy } from "@zerodev/permissions/policies"
import { newOwner } from "../../../../harness/accounts"
import {
    createSessionKeyAccount,
    sendCalls
} from "../../../../harness/permissions"

test("sudo policy allows arbitrary targets and calldata in one batch", async () => {
    const { account } = await createSessionKeyAccount({
        kernelVersion: "0.3.3",
        policies: [toSudoPolicy({})]
    })
    const receipt = await sendCalls(account, [
        { to: newOwner().address, data: "0x12345678" },
        { to: newOwner().address, data: "0x" }
    ])
    expect(receipt.success).toBeTrue()
})
