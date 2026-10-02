import { describe, expect, test } from "bun:test"
import {
    CallPolicyVersion,
    ParamCondition,
    toCallPolicy
} from "@zerodev/permissions/policies"
import {
    encodeFunctionData,
    parseAbi,
    parseEther,
    toFunctionSelector
} from "viem"
import { newOwner } from "../../../../harness/accounts"
import { setBalance } from "../../../../harness/anvil"
import {
    createSessionKeyAccount,
    sendCalls
} from "../../../../harness/permissions"

// Calls to an address without code always succeed at execution, so the
// policy alone decides whether an op passes.
const abi = parseAbi(["function poke(uint256 amount, address to, bytes data)"])
const otherSelector = toFunctionSelector("function other()")

const poke = (amount: bigint, data: `0x${string}` = "0x") =>
    encodeFunctionData({
        abi,
        functionName: "poke",
        args: [amount, "0x000000000000000000000000000000000000dEaD", data]
    })

const accountWith = async (
    permissions: Parameters<typeof toCallPolicy>[0]["permissions"]
) =>
    (
        await createSessionKeyAccount({
            kernelVersion: "0.3.3",
            policies: [
                toCallPolicy({
                    policyVersion: CallPolicyVersion.V0_0_5,
                    permissions
                })
            ]
        })
    ).account

const numeric: [string, ParamCondition, bigint | bigint[], bigint, bigint][] = [
    ["EQUAL", ParamCondition.EQUAL, 5n, 5n, 6n],
    ["GREATER_THAN", ParamCondition.GREATER_THAN, 5n, 6n, 5n],
    ["LESS_THAN", ParamCondition.LESS_THAN, 5n, 4n, 5n],
    ["GREATER_THAN_OR_EQUAL", ParamCondition.GREATER_THAN_OR_EQUAL, 5n, 5n, 4n],
    ["LESS_THAN_OR_EQUAL", ParamCondition.LESS_THAN_OR_EQUAL, 5n, 5n, 6n],
    ["NOT_EQUAL", ParamCondition.NOT_EQUAL, 5n, 6n, 5n],
    ["ONE_OF", ParamCondition.ONE_OF, [1n, 5n], 5n, 6n]
]

describe("call policy", () => {
    for (const [name, condition, value, pass, fail] of numeric) {
        test(`${name}: allows ${pass}, rejects ${fail}`, async () => {
            const target = newOwner().address
            const account = await accountWith([
                {
                    target,
                    abi,
                    functionName: "poke",
                    args: [{ condition, value } as never, null, null]
                }
            ])
            expect(
                (await sendCalls(account, [{ to: target, data: poke(pass) }]))
                    .success
            ).toBeTrue()
            await expect(
                sendCalls(account, [{ to: target, data: poke(fail) }])
            ).rejects.toThrow()
        })
    }

    test("SLICE_EQUAL on a bytes argument", async () => {
        const target = newOwner().address
        const account = await accountWith([
            {
                target,
                abi,
                functionName: "poke",
                args: [
                    null,
                    null,
                    {
                        condition: ParamCondition.SLICE_EQUAL,
                        value: "0xdeadbeef",
                        start: 0,
                        length: 4
                    }
                ]
            }
        ])
        expect(
            (
                await sendCalls(account, [
                    { to: target, data: poke(1n, "0xdeadbeef1234") }
                ])
            ).success
        ).toBeTrue()
        await expect(
            sendCalls(account, [
                { to: target, data: poke(1n, "0xcafebabe1234") }
            ])
        ).rejects.toThrow()
    })

    test("valueLimit allows up to the limit and rejects above it", async () => {
        const target = newOwner().address
        const account = await accountWith([{ target, valueLimit: 100n }])
        await setBalance("sepolia", account.address, parseEther("1"))
        expect(
            (await sendCalls(account, [{ to: target, value: 100n }])).success
        ).toBeTrue()
        await expect(
            sendCalls(account, [{ to: target, value: 101n }])
        ).rejects.toThrow()
    })

    test("selector-only permission rejects other selectors", async () => {
        const target = newOwner().address
        const account = await accountWith([
            {
                target,
                selector: toFunctionSelector(
                    "function poke(uint256,address,bytes)"
                )
            }
        ])
        expect(
            (await sendCalls(account, [{ to: target, data: poke(1n) }])).success
        ).toBeTrue()
        await expect(
            sendCalls(account, [{ to: target, data: otherSelector }])
        ).rejects.toThrow()
    })

    test("calls to an unlisted target are rejected", async () => {
        const target = newOwner().address
        const account = await accountWith([{ target, valueLimit: 0n }])
        await expect(
            sendCalls(account, [{ to: newOwner().address, data: "0x" }])
        ).rejects.toThrow()
    })
})
