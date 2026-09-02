import { describe, expect, test } from "bun:test"
import {
    type Address,
    type Hex,
    custom,
    defineChain,
    encodeAbiParameters,
    slice,
    toFunctionSelector,
    zeroAddress
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { signerToEip8130Actor } from "./accounts/signerToEip8130Actor.js"
import { toKernelEip8130Account } from "./accounts/toKernelEip8130Account.js"
import { createKernelEip8130Client } from "./clients/kernelEip8130Client.js"
import {
    ecrecoverAuthenticator,
    parseTransaction
} from "./vendor/eip8130/index.js"
import type { PayerClient } from "./vendor/eip8168/index.js"

const chain = defineChain({
    id: 84538453,
    name: "vibenet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["http://localhost"] } }
})
const kernelAddress: Address = "0x1111111111111111111111111111111111111111"
const recipient: Address = "0x2222222222222222222222222222222222222222"
const payerAddress: Address = "0x3333333333333333333333333333333333333333"
const txHash: Hex = `0x${"ab".repeat(32)}`
const owner = privateKeyToAccount(generatePrivateKey())
const account = toKernelEip8130Account({
    kernelAccount: { address: kernelAddress, kernelVersion: "0.3.1" },
    actor: signerToEip8130Actor(owner)
})

const getChangeSequences = toFunctionSelector("getChangeSequences(address)")
const getActorConfig = toFunctionSelector("getActorConfig(address,bytes32)")
const sequences = (multichain: bigint, epoch: number, sequence: number) =>
    encodeAbiParameters(
        [{ type: "uint64" }, { type: "uint32" }, { type: "uint32" }],
        [multichain, epoch, sequence]
    )
const actorConfig = (authenticator: Address) =>
    encodeAbiParameters(
        [{ type: "address" }, { type: "uint48" }, { type: "uint16" }],
        [authenticator, 0, 0]
    )

type Handlers = Record<string, (params: unknown[]) => unknown>
const rpc = (handlers: Handlers) =>
    custom({
        async request({ method, params }) {
            const handler = handlers[method]
            if (!handler) throw new Error(`unmocked rpc method ${method}`)
            return handler(params as unknown[])
        }
    })
/** Routes `eth_call` by selector; `"0x"` mimics a chain with no Keystore. */
const keystoreCall =
    (responses: Partial<Record<Hex, Hex>>) =>
    ([call]: unknown[]) => {
        const { data } = call as { data: Hex }
        return responses[slice(data, 0, 4)] ?? "0x"
    }

describe("getAccountStatus", () => {
    const status = (responses: Partial<Record<Hex, Hex>>) =>
        createKernelEip8130Client({
            account,
            chain,
            transport: rpc({ eth_call: keystoreCall(responses) })
        }).getAccountStatus()

    test("unsupported when the Keystore has no code", async () => {
        expect(await status({})).toEqual({ status: "unsupported" })
    })
    test("not-imported when the actor is not live and sequences are all zero", async () => {
        expect(
            await status({
                [getActorConfig]: actorConfig(zeroAddress),
                [getChangeSequences]: sequences(0n, 0, 0)
            })
        ).toEqual({ status: "not-imported" })
    })
    test("actor-inactive when the actor is not live on an initialized account", async () => {
        expect(
            await status({
                [getActorConfig]: actorConfig(zeroAddress),
                [getChangeSequences]: sequences(0n, 0, 1)
            })
        ).toEqual({ status: "actor-inactive" })
    })
    test("ready from the actor config alone, without reading sequences", async () => {
        const result = await status({
            [getActorConfig]: actorConfig(ecrecoverAuthenticator)
        })
        expect(result.status).toBe("ready")
        if (result.status === "ready") {
            expect(result.actor.authenticator).toBe(ecrecoverAuthenticator)
            expect(result.actor.scope).toBe(0)
        }
    })
})

describe("sendCalls (self-pay)", () => {
    let sent: Hex | undefined
    let estimateRequest: Record<string, unknown> | undefined
    const client = createKernelEip8130Client({
        account,
        chain,
        transport: rpc({
            // actor not yet bound on-chain -> sequenced nonce (key 0)
            eth_call: keystoreCall({
                [getActorConfig]: actorConfig(zeroAddress)
            }),
            eth_estimateGas: ([request]) => {
                estimateRequest = request as Record<string, unknown>
                return "0x30d40" // 200_000
            },
            eth_getTransactionCount: () => "0x5",
            eth_sendRawTransaction: ([raw]) => {
                sent = raw as Hex
                return txHash
            }
        })
    })
    const fees = { maxFeePerGas: 2n, maxPriorityFeePerGas: 1n }

    test("routes a value transfer through Kernel execute, estimates with headroom", async () => {
        const hash = await client.sendTransaction({
            to: recipient,
            value: 1n,
            ...fees
        })
        expect(hash).toBe(txHash)
        expect(estimateRequest?.sender).toBe(kernelAddress)
        expect(estimateRequest?.senderAuth).toBe(
            `${ecrecoverAuthenticator}${"ff".repeat(65)}`
        )
        const tx = parseTransaction(sent as Hex)
        expect(tx.from).toBe(kernelAddress)
        expect(tx.chainId).toBe(chain.id)
        expect(tx.gas).toBe(240_000n)
        expect(tx.nonceKey ?? 0n).toBe(0n) // zero is omitted on the wire
        expect(tx.nonceSequence).toBe(5n)
        expect(tx.payer).toBeUndefined()
        expect(tx.calls?.[0][0].to).toBe(kernelAddress) // execute self-call
        expect(slice(tx.senderAuth as Hex, 0, 20)).toBe(ecrecoverAuthenticator)
    })

    test("sends value-less calls directly from the Kernel", async () => {
        await client.sendCalls({
            calls: [{ to: recipient, data: "0x1234" }],
            gas: 100_000n,
            ...fees
        })
        const tx = parseTransaction(sent as Hex)
        expect(tx.gas).toBe(100_000n)
        expect(tx.calls?.[0][0]).toEqual({ to: recipient, data: "0x1234" })
    })
})

describe("sendCalls (ERC-8168 payer)", () => {
    let sent: Hex | undefined
    const payer: PayerClient = {
        getTerms: async () => ({
            options: [
                {
                    kind: "sponsored",
                    payer: payerAddress,
                    ttl: 300,
                    conditions: { maxExpiry: 300 }
                }
            ],
            gasEstimate: {
                gasLimit: "0x30d40",
                maxFeePerGas: "0x2",
                maxPriorityFeePerGas: "0x1"
            }
        }),
        sendTransaction: async ({ signedTransaction }) => {
            sent = signedTransaction
            return { transactionHash: txHash }
        },
        signTransaction: async () => {
            throw new Error("not advertised")
        },
        getSponsorshipBalance: async () => {
            throw new Error("unused")
        }
    }
    const client = createKernelEip8130Client({
        account,
        chain,
        payer,
        transport: rpc({
            eth_call: keystoreCall({
                [getActorConfig]: actorConfig(zeroAddress)
            }),
            eth_getTransactionCount: () => "0x0"
        })
    })

    test("signs over the payer's offer and hands it to the payer service", async () => {
        const hash = await client.sendTransaction({ to: recipient, value: 1n })
        expect(hash).toBe(txHash)
        const tx = parseTransaction(sent as Hex)
        expect(tx.payer).toBe(payerAddress)
        expect(tx.gas).toBe(200_000n)
        expect(tx.calls?.[0][0].to).toBe(kernelAddress) // value realized via Kernel execute
        expect(tx.validBefore).toBeGreaterThan(0n)
        expect(slice(tx.senderAuth as Hex, 0, 20)).toBe(ecrecoverAuthenticator)
    })
})
