import { describe, expect, test } from "bun:test"
import { toGasPolicy, toSudoPolicy } from "@zerodev/permissions/policies"
import { parseEther, zeroAddress } from "viem"
import { setBalance } from "../../../../harness/anvil"
import { getKernelClient } from "../../../../harness/clients"
import {
    createSessionKeyAccount,
    sendCalls
} from "../../../../harness/permissions"

const call = { to: zeroAddress }

describe("gas policy", () => {
    // Zero-fee sponsorship with a gas policy is the production path SUP-1431
    // came from. Its estimation failure does not reproduce on anvil (see the
    // README), but this catches the policy rejecting zero-fee ops.
    test("sponsored (zero-fee) op passes the gas policy", async () => {
        const { account } = await createSessionKeyAccount({
            kernelVersion: "0.3.3",
            policies: [
                toSudoPolicy({}),
                toGasPolicy({ allowed: parseEther("0.2") })
            ]
        })
        expect((await sendCalls(account, [call])).success).toBeTrue()
    })

    // Real fees (unsponsored project) so the policy's cost check is non-zero.
    const selfPaid = async (allowed: bigint) => {
        const { account } = await createSessionKeyAccount({
            kernelVersion: "0.3.3",
            policies: [toSudoPolicy({}), toGasPolicy({ allowed })]
        })
        await setBalance("sepolia", account.address, parseEther("1"))
        const client = getKernelClient(account, "sepolia", {
            project: "unsponsored"
        })
        const hash = await client.sendUserOperation({
            calls: [{ ...call, value: 0n, data: "0x" }]
        })
        return client.waitForUserOperationReceipt({ hash })
    }

    test("self-paid op within the budget succeeds", async () => {
        const receipt = await selfPaid(parseEther("100"))
        expect(receipt.success).toBeTrue()
        expect(receipt.actualGasCost).toBeGreaterThan(0n)
    })

    test("self-paid op costing more than the budget is rejected", async () => {
        await expect(selfPaid(1n)).rejects.toThrow(/AA23/)
    })
})
