import { expect, test } from "bun:test"
import {
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { http, hashMessage, zeroAddress } from "viem"
import { createEcdsaAccount } from "../../../harness/accounts"
import { getKernelClient, getPublicClient } from "../../../harness/clients"
import { CHAINS, zerodevRpc } from "../../../harness/env"
import { isValid6492 } from "../../../harness/verify"

const call = { to: zeroAddress, value: 0n, data: "0x" } as const

test("custom estimateFeesPerGas is used (zero fees, no paymaster)", async () => {
    let calls = 0
    const { account } = await createEcdsaAccount({
        chain: "sepolia",
        kernelVersion: "0.3.3"
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
        kernelVersion: "0.3.3"
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
    expect(seen[0]).toBeGreaterThanOrEqual(1_500_000n)
})

test.failing(
    "SUP-1498: kernelClient.signMessage forwards useReplayableSignature",
    async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion: "0.3.3"
        })
        const client = getKernelClient(account, "sepolia")
        const message = "zerodev e2e"
        const signature = await client.signMessage({
            message,
            useReplayableSignature: true
        } as Parameters<typeof client.signMessage>[0])
        expect(
            await isValid6492(
                "arbSepolia",
                account.address,
                hashMessage(message),
                signature
            )
        ).toBeTrue()
    }
)
