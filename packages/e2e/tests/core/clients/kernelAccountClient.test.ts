import { expect, test } from "bun:test"
import {
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { http, zeroAddress } from "viem"
import {
    KERNEL_V3_VERSIONS,
    createEcdsaAccount
} from "../../../harness/accounts"
import { getKernelClient, getPublicClient } from "../../../harness/clients"
import { CHAINS, zerodevRpc } from "../../../harness/env"
import { forEachKernelVersion } from "../../../harness/matrix"

const call = { to: zeroAddress, value: 0n, data: "0x" } as const

forEachKernelVersion(KERNEL_V3_VERSIONS, (kernelVersion) => {
    test("custom estimateFeesPerGas is used (zero fees, no paymaster)", async () => {
        let calls = 0
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion
        })
        const client = getKernelClient(account, "sepolia", {
            paymaster: "none",
            estimateFeesPerGas: async () => {
                calls++
                return { maxFeePerGas: 0n, maxPriorityFeePerGas: 0n }
            }
        })
        const hash = await client.sendUserOperation({ calls: [call] })
        expect(
            (await client.waitForUserOperationReceipt({ hash })).success
        ).toBeTrue()
        expect(calls).toBeGreaterThan(0)
    })

    test("custom paymaster hooks (ERC-7677 stub + data with a verificationGasLimit floor)", async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion
        })
        const chain = CHAINS.sepolia.chain
        const paymasterClient = createZeroDevPaymasterClient({
            chain,
            transport: http(zerodevRpc("sepolia"))
        })
        const seen: bigint[] = []
        const client = createKernelAccountClient({
            account,
            chain,
            client: getPublicClient("sepolia"),
            bundlerTransport: http(zerodevRpc("sepolia")),
            paymaster: {
                getPaymasterStubData: (userOperation) =>
                    paymasterClient.getPaymasterStubData(userOperation),
                getPaymasterData: async (userOperation) => {
                    // The stub's gas fields arrive as hex strings (viem passes
                    // UR's estimate through), so convert before doing math.
                    const estimated = BigInt(
                        userOperation.verificationGasLimit ?? 0n
                    )
                    let verificationGasLimit = (estimated * 110n) / 100n
                    if (verificationGasLimit < 1_500_000n) {
                        verificationGasLimit = 1_500_000n
                    }
                    seen.push(verificationGasLimit)
                    return {
                        ...(await paymasterClient.getPaymasterData({
                            ...userOperation,
                            verificationGasLimit
                        })),
                        verificationGasLimit
                    }
                }
            }
        })
        const hash = await client.sendUserOperation({ calls: [call] })
        expect(
            (await client.waitForUserOperationReceipt({ hash })).success
        ).toBeTrue()
        expect(seen.length).toBe(1)
        // The op that actually landed carries the overridden limit.
        const { userOperation } = await client.getUserOperation({ hash })
        expect(userOperation.verificationGasLimit).toBe(seen[0])
        expect(userOperation.verificationGasLimit).toBeGreaterThanOrEqual(
            1_500_000n
        )
    })
})

// Known bug, asserted as current behaviour so the test breaks once SUP-1498 is
// fixed. ECDSA signatures are deterministic, so the client's output must equal
// the account's non-replayable signature while the flag is dropped.
test("SUP-1498 (current behaviour): kernelClient.signMessage drops useReplayableSignature", async () => {
    const { account } = await createEcdsaAccount({
        chain: "sepolia",
        kernelVersion: "0.3.3"
    })
    const client = getKernelClient(account, "sepolia")
    const message = "zerodev e2e"
    const viaClient = await client.signMessage({
        message,
        useReplayableSignature: true
    } as Parameters<typeof client.signMessage>[0])
    expect(viaClient).toBe(await account.signMessage({ message }))
    expect(viaClient).not.toBe(
        await account.signMessage({ message, useReplayableSignature: true })
    )
})
