import { describe, expect, test } from "bun:test"
import { toGasPolicy, toSudoPolicy } from "@zerodev/permissions/policies"
import { parseEther, parseGwei, zeroAddress } from "viem"
import { setBalance } from "../../../../harness/anvil"
import { getKernelClient } from "../../../../harness/clients"
import {
    createSessionKeyAccount,
    sendCalls
} from "../../../../harness/permissions"

const call = { to: zeroAddress }

describe("gas policy", () => {
    test("large allowed budget: sponsored op succeeds", async () => {
        const { account } = await createSessionKeyAccount({
            kernelVersion: "0.3.3",
            policies: [
                toSudoPolicy({}),
                toGasPolicy({ allowed: parseEther("100") })
            ]
        })
        expect((await sendCalls(account, [call])).success).toBeTrue()
    })

    // SUP-1431 does not reproduce here: UR's estimator probes with gasleft(),
    // which anvil caps at the block gas limit (~60M), while production nodes
    // allow ~1.7e19 and push the probe's cost over a 0.2 ETH budget.
    test("small allowed budget (0.2 ETH): sponsored op succeeds on the local stack", async () => {
        const { account } = await createSessionKeyAccount({
            kernelVersion: "0.3.3",
            policies: [
                toSudoPolicy({}),
                toGasPolicy({ allowed: parseEther("0.2") })
            ]
        })
        expect((await sendCalls(account, [call])).success).toBeTrue()
    })

    test("op costing more than the budget is rejected (self-paid, real fees)", async () => {
        const { account } = await createSessionKeyAccount({
            kernelVersion: "0.3.3",
            policies: [toSudoPolicy({}), toGasPolicy({ allowed: 1n })]
        })
        await setBalance("sepolia", account.address, parseEther("1"))
        const client = getKernelClient(account, "sepolia", {
            paymaster: "none",
            estimateFeesPerGas: async () => ({
                maxFeePerGas: parseGwei("1"),
                maxPriorityFeePerGas: parseGwei("1")
            })
        })
        await expect(
            client.sendUserOperation({
                calls: [{ ...call, value: 0n, data: "0x" }]
            })
        ).rejects.toThrow()
    })
})
