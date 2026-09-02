import { describe, expect, test } from "bun:test"
import { KernelAccountAbi, KernelV3ExecuteAbi } from "@zerodev/sdk"
import {
    type Address,
    type Hex,
    concatHex,
    decodeFunctionData,
    keccak256,
    pad,
    recoverAddress,
    toHex
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { signerToEip8130Actor } from "./accounts/signerToEip8130Actor.js"
import { toKernelEip8130Account } from "./accounts/toKernelEip8130Account.js"
import { ecrecoverAuthenticator } from "./vendor/eip8130/index.js"

const owner = privateKeyToAccount(generatePrivateKey())
const kernelAddress: Address = "0x1111111111111111111111111111111111111111"
const recipient: Address = "0x2222222222222222222222222222222222222222"

describe("signerToEip8130Actor", () => {
    test("derives the k1 actor and keeps a raw-signing signer", async () => {
        const actor = signerToEip8130Actor(owner)
        expect(actor.actorId).toBe(pad(owner.address, { size: 32 }))
        expect(actor.authenticator).toBe(ecrecoverAuthenticator)
        const hash = keccak256("0x1234")
        const signature = await actor.signer.sign?.({ hash })
        if (!signature) throw new Error("signer did not sign")
        expect(await recoverAddress({ hash, signature })).toBe(owner.address)
    })

    test("rejects signers without raw signing", () => {
        expect(() =>
            signerToEip8130Actor({ address: owner.address } as never)
        ).toThrow("raw hash signing")
    })
})

describe("toKernelEip8130Account", () => {
    const actor = signerToEip8130Actor(owner)
    const account = toKernelEip8130Account({
        kernelAccount: { address: kernelAddress, kernelVersion: "0.3.1" },
        actor
    })

    test("binds the Kernel address and the actor", () => {
        expect(account.address).toBe(kernelAddress)
        expect(account.actorId).toBe(actor.actorId)
        expect(account.kernelVersion).toBe("0.3.1")
        // address-only: deployment is the 4337 client's job
        expect(() => account.create()).toThrow()
    })

    test("encodes a single value-bearing call as Kernel v3 execute(single)", () => {
        const calls = [{ to: recipient, value: 1n, data: "0xabcd" as Hex }]
        const wire = account.encodeExecute({ account: kernelAddress, calls })
        expect(wire.to).toBe(kernelAddress)
        const { functionName, args } = decodeFunctionData({
            abi: KernelV3ExecuteAbi,
            data: wire.data ?? "0x"
        })
        expect(functionName).toBe("execute")
        const [execMode, executionCalldata] = args as [Hex, Hex]
        expect(execMode.slice(0, 4)).toBe("0x00") // CALL_TYPE.SINGLE
        expect(executionCalldata).toBe(
            concatHex([recipient, toHex(1n, { size: 32 }), "0xabcd"])
        )
    })

    test("encodes several calls as Kernel v3 execute(batch)", () => {
        const calls = [
            { to: recipient, value: 1n, data: "0x" as Hex },
            { to: kernelAddress, value: 0n, data: "0x01" as Hex }
        ]
        const wire = account.encodeExecute({ account: kernelAddress, calls })
        const { args } = decodeFunctionData({
            abi: KernelV3ExecuteAbi,
            data: wire.data ?? "0x"
        })
        expect((args as [Hex, Hex])[0].slice(0, 4)).toBe("0x01") // CALL_TYPE.BATCH
    })

    test("uses Kernel v2 executeBatch for 0.2.x", () => {
        const v2 = toKernelEip8130Account({
            kernelAccount: { address: kernelAddress, kernelVersion: "0.2.4" },
            actor
        })
        const calls = [
            { to: recipient, value: 1n, data: "0x" as Hex },
            { to: recipient, value: 2n, data: "0x" as Hex }
        ]
        const wire = v2.encodeExecute({ account: kernelAddress, calls })
        const { functionName } = decodeFunctionData({
            abi: KernelAccountAbi,
            data: wire.data ?? "0x"
        })
        expect(functionName).toBe("executeBatch")
    })
})
