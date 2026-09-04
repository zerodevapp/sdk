import { describe, expect, test } from "bun:test"
import {
    type Address,
    type Hex,
    concatHex,
    decodeFunctionData,
    encodeAbiParameters,
    keccak256,
    pad,
    parseAbi,
    parseAbiParameters,
    toHex
} from "viem"
import { KernelV3AccountAbi } from "../../accounts/kernel/abi/kernel_v_3_0_0/KernelAccountAbi.js"
import {
    importEip8130Account,
    kernel8130ImplementationAddress
} from "./importEip8130Account.js"

const kernelAddress: Address = "0x1111111111111111111111111111111111111111"
const owner: Address = "0x2222222222222222222222222222222222222222"
const userOpHash: Hex = `0x${"cd".repeat(32)}`
// EIP-8130 canonical authenticators: native ecrecover sentinel and the passkey verifier.
const k1Authenticator: Address = "0x0000000000000000000000000000000000000001"
const passkeyAuthenticator: Address =
    "0x813007b6b1b48E75D91dEc5927ab515d12a0F1d0"
const pubX = 7n
const pubY = 11n

type FakeSudo = { source: string; getEnableData: () => Promise<Hex> }
const ecdsaSudo: FakeSudo = {
    source: "ECDSAValidator",
    getEnableData: async () => owner
}
const webAuthnSudo: FakeSudo = {
    source: "WebAuthnValidator",
    getEnableData: async () =>
        encodeAbiParameters(
            parseAbiParameters("(uint256 x, uint256 y), bytes32"),
            [{ x: pubX, y: pubY }, `0x${"ab".repeat(32)}`]
        )
}

/** Fake 4337 client: `getAction` picks `client.sendUserOperation`. */
const fakeClient = (sudo: FakeSudo | undefined, kernelVersion = "0.3.1") => {
    let sent: { calls: { to: Address; data: Hex }[] } | undefined
    const client = {
        account: {
            address: kernelAddress,
            kernelVersion,
            kernelPluginManager: { sudoValidator: sudo }
        },
        sendUserOperation: async (args: typeof sent) => {
            sent = args
            return userOpHash
        }
    }
    return { client: client as never, calls: () => sent?.calls ?? [] }
}

const importAbi = parseAbi([
    "struct InitialActor { bytes32 actorId; address authenticator; uint16 scope; bytes policyData; }",
    "function importToKeystore(InitialActor[] actors)"
])
const decodeUpgrade = (data: Hex) =>
    decodeFunctionData({ abi: KernelV3AccountAbi, data })
const decodeImport = (data: Hex) =>
    decodeFunctionData({ abi: importAbi, data }).args[0]

describe("importEip8130Account", () => {
    test("upgrades to Kernel8130 and imports the ECDSA owner as k1 admin actor", async () => {
        const { client, calls } = fakeClient(ecdsaSudo)
        expect(await importEip8130Account(client)).toBe(userOpHash)
        expect(calls().map((c) => c.to)).toEqual([kernelAddress, kernelAddress])
        expect(decodeUpgrade(calls()[0].data)).toEqual({
            functionName: "upgradeTo",
            args: [kernel8130ImplementationAddress]
        })
        expect(decodeImport(calls()[1].data)).toEqual([
            {
                actorId: pad(owner, { size: 32 }),
                authenticator: k1Authenticator,
                scope: 0,
                policyData: "0x"
            }
        ])
    })

    test("imports a WebAuthn sudo key as passkey admin actor", async () => {
        const { client, calls } = fakeClient(webAuthnSudo)
        await importEip8130Account(client)
        const x = toHex(pubX, { size: 32 })
        const y = toHex(pubY, { size: 32 })
        expect(decodeImport(calls()[1].data)).toEqual([
            {
                actorId: keccak256(concatHex([x, y])),
                authenticator: passkeyAuthenticator,
                scope: 0,
                policyData: "0x"
            }
        ])
    })

    test("honours a custom implementation", async () => {
        const { client, calls } = fakeClient(ecdsaSudo)
        const implementation: Address =
            "0x5555555555555555555555555555555555555555"
        await importEip8130Account(client, { implementation })
        expect(decodeUpgrade(calls()[0].data).args).toEqual([implementation])
    })

    test("rejects other sudo validators", async () => {
        const { client } = fakeClient({
            source: "PermissionValidator",
            getEnableData: async () => "0x"
        })
        await expect(importEip8130Account(client)).rejects.toThrow(
            /ECDSA or WebAuthn/
        )
    })

    test("rejects accounts without a sudo validator", async () => {
        const { client } = fakeClient(undefined)
        await expect(importEip8130Account(client)).rejects.toThrow(
            /sudo validator/
        )
    })

    test("rejects Kernel v2 accounts", async () => {
        const { client } = fakeClient(ecdsaSudo, "0.2.4")
        await expect(importEip8130Account(client)).rejects.toThrow(/Kernel v3/)
    })
})
