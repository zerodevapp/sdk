import { describe, expect, test } from "bun:test"
import { createKernelAccount } from "@zerodev/sdk"
import {
    KERNEL_7702_DELEGATION_ADDRESS,
    KERNEL_V3_3
} from "@zerodev/sdk/constants"
import { hashMessage, hashTypedData, zeroAddress } from "viem"
import type { PrivateKeyAccount } from "viem/accounts"
import { ENTRY_POINT, newOwner } from "../../../harness/accounts"
import { getKernelClient, getPublicClient } from "../../../harness/clients"
import type { ChainKey } from "../../../harness/env"
import { isValid1271 } from "../../../harness/verify"

const call = { to: zeroAddress, value: 0n, data: "0x" } as const

async function delegated(eoa: PrivateKeyAccount, chain: ChainKey) {
    const account = await createKernelAccount(getPublicClient(chain), {
        eip7702Account: eoa,
        entryPoint: ENTRY_POINT,
        kernelVersion: KERNEL_V3_3
    })
    const client = getKernelClient(account, chain)
    const hash = await client.sendUserOperation({ calls: [call] })
    expect(
        (await client.waitForUserOperationReceipt({ hash })).success
    ).toBeTrue()
    return { account, client }
}

describe("EIP-7702 (kernel 0.3.3)", () => {
    test("EOA delegates to Kernel, sends a sponsored op and signs", async () => {
        const eoa = newOwner()
        const { account } = await delegated(eoa, "sepolia")
        expect(account.address).toBe(eoa.address)
        const code = await getPublicClient("sepolia").getCode({
            address: eoa.address
        })
        expect(code?.toLowerCase()).toBe(
            `0xef0100${KERNEL_7702_DELEGATION_ADDRESS.slice(2)}`.toLowerCase()
        )
        const message = "zerodev e2e 7702"
        const signature = await account.signMessage({ message })
        expect(
            await isValid1271(
                "sepolia",
                eoa.address,
                hashMessage(message),
                signature
            )
        ).toBeTrue()
    })

    test("second op on an already-delegated EOA skips re-authorization", async () => {
        const eoa = newOwner()
        const account = await createKernelAccount(getPublicClient("sepolia"), {
            eip7702Account: eoa,
            entryPoint: ENTRY_POINT,
            kernelVersion: KERNEL_V3_3
        })
        const client = getKernelClient(account, "sepolia")
        // The bundle tx carries the 7702 authorization list only when the op
        // included one.
        const send = async () => {
            const hash = await client.sendUserOperation({ calls: [call] })
            const { success, receipt } =
                await client.waitForUserOperationReceipt({ hash })
            expect(success).toBeTrue()
            return getPublicClient("sepolia").getTransaction({
                hash: receipt.transactionHash
            })
        }
        const first = await send()
        const second = await send()
        expect(first.type).toBe("eip7702")
        expect(first.authorizationList?.length).toBe(1)
        expect(second.type).not.toBe("eip7702")
    })

    test("signTypedData verifies via ERC-1271", async () => {
        const eoa = newOwner()
        const { account } = await delegated(eoa, "sepolia")
        const typedData = {
            domain: { name: "E2E", version: "1", chainId: 1 },
            types: { Mail: [{ name: "contents", type: "string" }] },
            primaryType: "Mail",
            message: { contents: "7702" }
        } as const
        const signature = await account.signTypedData(typedData)
        expect(
            await isValid1271(
                "sepolia",
                eoa.address,
                hashTypedData(typedData),
                signature
            )
        ).toBeTrue()
    })

    // Two delegations on two forks: allow for cold fork caches.
    test(
        "replayable signature from one chain verifies on another where the EOA is also delegated",
        { timeout: 60_000 },
        async () => {
            const eoa = newOwner()
            const { account } = await delegated(eoa, "sepolia")
            await delegated(eoa, "arbSepolia")
            const message = "zerodev e2e 7702 replayable"
            const signature = await account.signMessage({
                message,
                useReplayableSignature: true
            })
            expect(
                await isValid1271(
                    "arbSepolia",
                    eoa.address,
                    hashMessage(message),
                    signature
                )
            ).toBeTrue()
        }
    )
})
