import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { createGateway, normalizeUserOp } from "./gateway"

type Recorded = { method: string; params: unknown[]; id: unknown }

const recorded: Recorded[] = []
let upstream: ReturnType<typeof Bun.serve>
let gateway: ReturnType<typeof Bun.serve>

beforeAll(() => {
    upstream = Bun.serve({
        port: 0,
        async fetch(req) {
            const body = (await req.json()) as Recorded
            recorded.push(body)
            return Response.json({
                jsonrpc: "2.0",
                id: body.id,
                result: { echoed: body.method }
            })
        }
    })
    gateway = Bun.serve({
        port: 0,
        fetch: createGateway({
            "11155111": `http://127.0.0.1:${upstream.port}/rpc`
        })
    })
})

afterAll(() => {
    upstream.stop(true)
    gateway.stop(true)
})

const url = (chainId: number) =>
    `http://127.0.0.1:${gateway.port}/api/v3/local/chain/${chainId}`

const call = async (body: unknown, chainId = 11155111) => {
    const res = await fetch(url(chainId), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
    })
    return { status: res.status, json: await res.json() }
}

const userOp07 = { sender: "0x01", nonce: "0x0", callData: "0x" }
const EP = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"

describe("gateway", () => {
    test("zd_getUserOperationGasPrice returns zero fees without calling UR", async () => {
        const before = recorded.length
        const { json } = await call({
            jsonrpc: "2.0",
            id: 7,
            method: "zd_getUserOperationGasPrice",
            params: []
        })
        const zero = { maxFeePerGas: "0x0", maxPriorityFeePerGas: "0x0" }
        expect(json).toEqual({
            jsonrpc: "2.0",
            id: 7,
            result: { slow: zero, standard: zero, fast: zero }
        })
        expect(recorded.length).toBe(before)
    })

    test("unsponsored project gets real fees from UR's pimlico_getUserOperationGasPrice", async () => {
        const res = await fetch(
            `http://127.0.0.1:${gateway.port}/api/v3/unsponsored/chain/11155111`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 11,
                    method: "zd_getUserOperationGasPrice",
                    params: []
                })
            }
        )
        expect(recorded.at(-1)).toEqual({
            jsonrpc: "2.0",
            id: 11,
            method: "pimlico_getUserOperationGasPrice",
            params: []
        } as unknown as Recorded)
        expect((await res.json()).result).toEqual({
            echoed: "pimlico_getUserOperationGasPrice"
        })
    })

    test("zd_sponsorUserOperation is forwarded as eth_estimateUserOperationGas", async () => {
        const { json } = await call({
            jsonrpc: "2.0",
            id: 8,
            method: "zd_sponsorUserOperation",
            params: [
                {
                    chainId: 11155111,
                    userOp: userOp07,
                    entryPointAddress: EP,
                    shouldOverrideFee: false,
                    shouldConsume: true
                }
            ]
        })
        expect(recorded.at(-1)).toEqual({
            jsonrpc: "2.0",
            id: 8,
            method: "eth_estimateUserOperationGas",
            params: [userOp07, EP]
        } as unknown as Recorded)
        expect(json).toEqual({
            jsonrpc: "2.0",
            id: 8,
            result: { echoed: "eth_estimateUserOperationGas" }
        })
    })

    test("pm_getPaymasterStubData and pm_getPaymasterData are forwarded as eth_estimateUserOperationGas", async () => {
        for (const method of [
            "pm_getPaymasterStubData",
            "pm_getPaymasterData"
        ]) {
            await call({
                jsonrpc: "2.0",
                id: 9,
                method,
                params: [userOp07, EP, "0xaa36a7", {}]
            })
            expect(recorded.at(-1)?.method).toBe("eth_estimateUserOperationGas")
            expect(recorded.at(-1)?.params).toEqual([userOp07, EP])
        }
    })

    test("other methods are forwarded unchanged", async () => {
        const body = {
            jsonrpc: "2.0",
            id: 10,
            method: "eth_supportedEntryPoints",
            params: []
        }
        const { json } = await call(body)
        expect(recorded.at(-1)).toEqual(body as unknown as Recorded)
        expect(json.result).toEqual({ echoed: "eth_supportedEntryPoints" })
    })

    test("batched bodies answer every entry and keep ids", async () => {
        const { json } = await call([
            { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
            {
                jsonrpc: "2.0",
                id: 2,
                method: "zd_getUserOperationGasPrice",
                params: []
            }
        ])
        expect(json.map((r: { id: number }) => r.id)).toEqual([1, 2])
    })

    test("unknown chain id returns 404 naming the path", async () => {
        const { status, json } = await call(
            { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
            1
        )
        expect(status).toBe(404)
        expect(json.error).toContain("/api/v3/local/chain/1")
    })

    test("health endpoint responds ok", async () => {
        const res = await fetch(`http://127.0.0.1:${gateway.port}/health`)
        expect(res.status).toBe(200)
        expect(await res.text()).toBe("ok")
    })
})

describe("normalizeUserOp", () => {
    test("adds paymasterAndData to v0.6 ops that lack it", () => {
        expect(normalizeUserOp({ initCode: "0x" })).toEqual({
            initCode: "0x",
            paymasterAndData: "0x"
        })
    })

    test("leaves v0.7 ops unchanged", () => {
        expect(normalizeUserOp(userOp07)).toEqual(userOp07)
    })

    test("moves authorization to eip7702Auth and turns zero-quantity '0x' into '0x0'", () => {
        expect(
            normalizeUserOp({ authorization: { nonce: "0x", yParity: "0x1" } })
        ).toEqual({ eip7702Auth: { nonce: "0x0", yParity: "0x1" } })
    })
})
