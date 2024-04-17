// @ts-expect-error
import { describe, expect, test } from "bun:test"
import { createFallbackTransport } from "@zerodev/sdk"
import { http } from "viem"
import { localhost } from "viem/chains"
import { createHttpServer } from "./utils"

describe("request", () => {
    test("default", async () => {
        const bundlerServer = await createHttpServer((_req, res) => {
            res.writeHead(200, {
                "Content-Type": "application/json"
            })
            res.end(JSON.stringify({ result: "0x1" }))
        })

        const paymasterServer = await createHttpServer((_req, res) => {
            res.writeHead(200, {
                "Content-Type": "application/json"
            })
            res.end(JSON.stringify({ result: "0x1" }))
        })

        const bundlerHttpServer = http(bundlerServer.url)
        const paymasterHttpServer = http(paymasterServer.url)

        const { bundlerFallbackTransport, paymasterFallbackTransport } =
            createFallbackTransport([
                {
                    bundlerTransport: bundlerHttpServer,
                    paymasterTransport: paymasterHttpServer
                }
            ])

        const bundlerTransport = bundlerFallbackTransport({ chain: localhost })
        const paymasterTransport = paymasterFallbackTransport({
            chain: localhost
        })

        expect(
            await bundlerTransport.request({ method: "eth_blockNumber" })
        ).toBe("0x1")
        expect(
            await paymasterTransport.request({ method: "eth_blockNumber" })
        ).toBe("0x1")
    })

    test("when bundler servers failed, it should not try failed pairs for paymaster server", async () => {
        let bundlerServerCount = 0
        let paymasterServerCount = 0

        const bundlerServer1 = await createHttpServer((_req, res) => {
            console.log("bundlerServer1")
            bundlerServerCount++
            res.writeHead(500)
            res.end()
        })
        const bundlerServer2 = await createHttpServer((_req, res) => {
            console.log("bundlerServer2")
            bundlerServerCount++
            res.writeHead(500)
            res.end()
        })
        const bundlerServer3 = await createHttpServer((_req, res) => {
            console.log("bundlerServer3")
            bundlerServerCount++
            res.writeHead(200, {
                "Content-Type": "application/json"
            })
            res.end(JSON.stringify({ result: "0x1" }))
        })

        const paymasterServer1 = await createHttpServer((_req, res) => {
            console.log("paymasterServer1")
            paymasterServerCount++
            res.writeHead(200, {
                "Content-Type": "application/json"
            })
            res.end(JSON.stringify({ result: "0x11" }))
        })

        const paymasterServer2 = await createHttpServer((_req, res) => {
            console.log("paymasterServer2")
            paymasterServerCount++
            res.writeHead(200, {
                "Content-Type": "application/json"
            })
            res.end(JSON.stringify({ result: "0x12" }))
        })

        const paymasterServer3 = await createHttpServer((_req, res) => {
            console.log("paymasterServer3")
            paymasterServerCount++
            res.writeHead(200, {
                "Content-Type": "application/json"
            })
            res.end(JSON.stringify({ result: "0x13" }))
        })

        const bundlerHttpServer1 = http(bundlerServer1.url)
        const bundlerHttpServer2 = http(bundlerServer2.url)
        const bundlerHttpServer3 = http(bundlerServer3.url)
        const paymasterHttpServer1 = http(paymasterServer1.url)
        const paymasterHttpServer2 = http(paymasterServer2.url)
        const paymasterHttpServer3 = http(paymasterServer3.url)

        const { bundlerFallbackTransport, paymasterFallbackTransport } =
            createFallbackTransport([
                {
                    bundlerTransport: bundlerHttpServer1,
                    paymasterTransport: paymasterHttpServer1
                },
                {
                    bundlerTransport: bundlerHttpServer2,
                    paymasterTransport: paymasterHttpServer2
                },
                {
                    bundlerTransport: bundlerHttpServer3,
                    paymasterTransport: paymasterHttpServer3
                }
            ])

        const bundlerTransport = bundlerFallbackTransport({ chain: localhost })
        const paymasterTransport = paymasterFallbackTransport({
            chain: localhost
        })

        expect(
            await bundlerTransport.request({ method: "eth_blockNumber" })
        ).toBe("0x1")
        expect(
            await paymasterTransport.request({ method: "eth_blockNumber" })
        ).toBe("0x13")

        expect(bundlerServerCount).toBe(3)
        expect(paymasterServerCount).toBe(1)
    })

    test("it should throw an error if all servers failed", async () => {
        let bundlerServerCount = 0
        let paymasterServerCount = 0

        const bundlerServer1 = await createHttpServer((_req, res) => {
            console.log("bundlerServer1")
            bundlerServerCount++
            res.writeHead(500)
            res.end()
        })
        const bundlerServer2 = await createHttpServer((_req, res) => {
            console.log("bundlerServer2")
            bundlerServerCount++
            res.writeHead(500)
            res.end()
        })
        const bundlerServer3 = await createHttpServer((_req, res) => {
            console.log("bundlerServer3")
            bundlerServerCount++
            res.writeHead(500)
            res.end()
        })

        const paymasterServer1 = await createHttpServer((_req, res) => {
            console.log("paymasterServer1")
            paymasterServerCount++
            res.writeHead(500)
            res.end()
        })

        const paymasterServer2 = await createHttpServer((_req, res) => {
            console.log("paymasterServer2")
            paymasterServerCount++
            res.writeHead(500)
            res.end()
        })

        const paymasterServer3 = await createHttpServer((_req, res) => {
            console.log("paymasterServer3")
            paymasterServerCount++
            res.writeHead(500)
            res.end()
        })

        const bundlerHttpServer1 = http(bundlerServer1.url)
        const bundlerHttpServer2 = http(bundlerServer2.url)
        const bundlerHttpServer3 = http(bundlerServer3.url)
        const paymasterHttpServer1 = http(paymasterServer1.url)
        const paymasterHttpServer2 = http(paymasterServer2.url)
        const paymasterHttpServer3 = http(paymasterServer3.url)

        const { bundlerFallbackTransport, paymasterFallbackTransport } =
            createFallbackTransport(
                [
                    {
                        bundlerTransport: bundlerHttpServer1,
                        paymasterTransport: paymasterHttpServer1
                    },
                    {
                        bundlerTransport: bundlerHttpServer2,
                        paymasterTransport: paymasterHttpServer2
                    },
                    {
                        bundlerTransport: bundlerHttpServer3,
                        paymasterTransport: paymasterHttpServer3
                    }
                ],
                {
                    retryCount: 0
                }
            )

        const bundlerTransport = bundlerFallbackTransport({ chain: localhost })
        const paymasterTransport = paymasterFallbackTransport({
            chain: localhost
        })

        await expect(
            bundlerTransport.request({ method: "eth_blockNumber" })
        ).rejects.toThrowError()
        await expect(
            paymasterTransport.request({ method: "eth_blockNumber" })
        ).rejects.toThrowError()

        expect(bundlerServerCount).toBe(3)
        expect(paymasterServerCount).toBe(3)
    })
})
