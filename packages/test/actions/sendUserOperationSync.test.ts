import { describe, expect, test } from "bun:test"
import {
    SEND_USER_OPERATION_SYNC_TIMEOUT_CODE,
    createKernelAccountClient,
    sendUserOperationSync
} from "@zerodev/sdk"
import {
    type Address,
    type EIP1193RequestFn,
    type Hex,
    RpcRequestError,
    createClient,
    custom,
    zeroAddress
} from "viem"
import {
    entryPoint07Abi,
    entryPoint07Address,
    toSmartAccount
} from "viem/account-abstraction"
import { sepolia } from "viem/chains"

const SENDER: Address = "0x1111111111111111111111111111111111111111"
const TARGET: Address = "0x2222222222222222222222222222222222222222"
const USER_OP_HASH: Hex =
    "0x3333333333333333333333333333333333333333333333333333333333333333"
const TX_HASH: Hex =
    "0x4444444444444444444444444444444444444444444444444444444444444444"
const BLOCK_HASH: Hex =
    "0x5555555555555555555555555555555555555555555555555555555555555555"
const SIGNATURE: Hex = "0xdeadbeef"

const rpcReceipt = {
    userOpHash: USER_OP_HASH,
    entryPoint: entryPoint07Address,
    sender: SENDER,
    nonce: "0x0",
    paymaster: zeroAddress,
    actualGasCost: "0x2386f26fc10000",
    actualGasUsed: "0x186a0",
    success: true,
    reason: "0x",
    logs: [],
    receipt: {
        transactionHash: TX_HASH,
        transactionIndex: "0x0",
        blockHash: BLOCK_HASH,
        blockNumber: "0x10",
        from: SENDER,
        to: entryPoint07Address,
        cumulativeGasUsed: "0x186a0",
        gasUsed: "0x186a0",
        effectiveGasPrice: "0x3b9aca00",
        contractAddress: null,
        logs: [],
        logsBloom: `0x${"0".repeat(512)}`,
        status: "0x1",
        type: "0x2"
    }
}

type Call = { method: string; params: unknown }

const rpcError = (error: { code: number; message: string; data?: unknown }) =>
    new RpcRequestError({ body: {}, error, url: "http://bundler.test" })

const createMockClient = (
    handlers: Record<string, (params: unknown) => unknown>
) => {
    const calls: Call[] = []
    const request = (async ({ method, params }) => {
        calls.push({ method, params })
        const handler = handlers[method]
        if (!handler) throw new Error(`unexpected RPC method ${method}`)
        return handler(params)
    }) as EIP1193RequestFn

    return { calls, transport: custom({ request }) }
}

const createTestKernelClient = async (
    handlers: Record<string, (params: unknown) => unknown>
) => {
    const bundler = createMockClient({
        zd_getUserOperationGasPrice: () => ({
            slow: { maxFeePerGas: "0x1", maxPriorityFeePerGas: "0x1" },
            standard: {
                maxFeePerGas: "0x3b9aca00",
                maxPriorityFeePerGas: "0x5f5e100"
            },
            fast: { maxFeePerGas: "0x2", maxPriorityFeePerGas: "0x2" }
        }),
        eth_estimateUserOperationGas: () => ({
            callGasLimit: "0x10000",
            verificationGasLimit: "0x20000",
            preVerificationGas: "0x30000"
        }),
        ...handlers
    })
    const chain = createMockClient({ eth_getCode: () => "0x01" })

    const account = await toSmartAccount({
        client: createClient({ chain: sepolia, transport: chain.transport }),
        entryPoint: {
            abi: entryPoint07Abi,
            address: entryPoint07Address,
            version: "0.7"
        },
        getAddress: async () => SENDER,
        encodeCalls: async () => "0xc0ffee",
        getFactoryArgs: async () => ({
            factory: undefined,
            factoryData: undefined
        }),
        getNonce: async () => 0n,
        getStubSignature: async () => "0x00",
        signMessage: async () => SIGNATURE,
        signTypedData: async () => SIGNATURE,
        signUserOperation: async () => SIGNATURE
    })

    const kernelClient = createKernelAccountClient({
        account,
        chain: sepolia,
        bundlerTransport: bundler.transport,
        pollingInterval: 10
    })

    return { kernelClient, calls: bundler.calls }
}

describe("sendUserOperationSync", () => {
    test("returns the formatted receipt from zd_sendUserOperationSync", async () => {
        const { kernelClient, calls } = await createTestKernelClient({
            zd_sendUserOperationSync: () => rpcReceipt
        })

        const receipt = await kernelClient.sendUserOperationSync({
            calls: [{ to: TARGET, value: 0n, data: "0x" }],
            timeoutMs: 5_000
        })

        expect(receipt.userOpHash).toBe(USER_OP_HASH)
        expect(receipt.actualGasCost).toBe(10000000000000000n)
        expect(receipt.actualGasUsed).toBe(100000n)
        expect(receipt.receipt.blockNumber).toBe(16n)
        expect(receipt.receipt.status).toBe("success")

        const sync = calls.filter(
            (c) => c.method === "zd_sendUserOperationSync"
        )
        expect(sync).toHaveLength(1)
        const [userOp, entryPoint, options] = sync[0].params as [
            Record<string, Hex>,
            Address,
            { timeoutMs: number }
        ]
        expect(entryPoint).toBe(entryPoint07Address)
        expect(options).toEqual({ timeoutMs: 5_000 })
        expect(userOp.sender).toBe(SENDER)
        expect(userOp.callData).toBe("0xc0ffee")
        expect(userOp.signature).toBe(SIGNATURE)
        expect(userOp.nonce).toBe("0x0")
        expect(userOp.maxFeePerGas).toBe("0x3b9aca00")
        expect(userOp.callGasLimit).toBe("0x10000")
        expect(calls.some((c) => c.method === "eth_sendUserOperation")).toBe(
            false
        )
    })

    test("omits the options object when timeoutMs is not set", async () => {
        const { kernelClient, calls } = await createTestKernelClient({
            zd_sendUserOperationSync: () => rpcReceipt
        })

        await sendUserOperationSync(kernelClient, {
            calls: [{ to: TARGET, value: 0n, data: "0x" }]
        })

        const sync = calls.find((c) => c.method === "zd_sendUserOperationSync")
        expect(sync?.params).toHaveLength(2)
    })

    test("falls back to polling eth_getUserOperationReceipt on timeout", async () => {
        let polls = 0
        const { kernelClient, calls } = await createTestKernelClient({
            zd_sendUserOperationSync: () => {
                throw rpcError({
                    code: SEND_USER_OPERATION_SYNC_TIMEOUT_CODE,
                    message: "timed out waiting for receipt",
                    data: { userOpHash: USER_OP_HASH }
                })
            },
            eth_getUserOperationReceipt: () => {
                polls++
                return polls < 2 ? null : rpcReceipt
            }
        })

        const receipt = await kernelClient.sendUserOperationSync({
            calls: [{ to: TARGET, value: 0n, data: "0x" }]
        })

        expect(receipt.userOpHash).toBe(USER_OP_HASH)
        expect(receipt.receipt.transactionHash).toBe(TX_HASH)
        const polled = calls.filter(
            (c) => c.method === "eth_getUserOperationReceipt"
        )
        expect(polled.length).toBeGreaterThanOrEqual(2)
        expect(polled[0].params).toEqual([USER_OP_HASH])
    })

    test("falls back on a timeout from an EIP-1193 provider error", async () => {
        const { kernelClient } = await createTestKernelClient({
            zd_sendUserOperationSync: () => {
                throw Object.assign(new Error("timed out"), {
                    code: SEND_USER_OPERATION_SYNC_TIMEOUT_CODE,
                    data: { userOpHash: USER_OP_HASH }
                })
            },
            eth_getUserOperationReceipt: () => rpcReceipt
        })

        const receipt = await kernelClient.sendUserOperationSync({
            calls: [{ to: TARGET, value: 0n, data: "0x" }]
        })

        expect(receipt.userOpHash).toBe(USER_OP_HASH)
    })

    test("rethrows the timeout when fallbackToPolling is false", async () => {
        const { kernelClient, calls } = await createTestKernelClient({
            zd_sendUserOperationSync: () => {
                throw rpcError({
                    code: SEND_USER_OPERATION_SYNC_TIMEOUT_CODE,
                    message: "timed out waiting for receipt",
                    data: { userOpHash: USER_OP_HASH }
                })
            }
        })

        const error = await kernelClient
            .sendUserOperationSync({
                calls: [{ to: TARGET, value: 0n, data: "0x" }],
                fallbackToPolling: false
            })
            .catch((e) => e)

        expect(error).toBeInstanceOf(Error)
        const timeout = error.walk(
            (e: unknown) =>
                (e as { code?: number }).code ===
                SEND_USER_OPERATION_SYNC_TIMEOUT_CODE
        )
        expect(timeout?.data).toEqual({ userOpHash: USER_OP_HASH })
        expect(
            calls.some((c) => c.method === "eth_getUserOperationReceipt")
        ).toBe(false)
    })

    test("does not poll when the bundler reports the operation dropped", async () => {
        const { kernelClient, calls } = await createTestKernelClient({
            zd_sendUserOperationSync: () => {
                throw rpcError({
                    code: -32010,
                    message: "user operation dropped",
                    data: { userOpHash: USER_OP_HASH, reason: "replaced" }
                })
            }
        })

        const error = await kernelClient
            .sendUserOperationSync({
                calls: [{ to: TARGET, value: 0n, data: "0x" }]
            })
            .catch((e) => e)

        expect(error).toBeInstanceOf(Error)
        const dropped = error.walk(
            (e: unknown) => (e as { code?: number }).code === -32010
        )
        expect(dropped?.data).toEqual({
            userOpHash: USER_OP_HASH,
            reason: "replaced"
        })
        expect(
            calls.some((c) => c.method === "eth_getUserOperationReceipt")
        ).toBe(false)
    })
})
