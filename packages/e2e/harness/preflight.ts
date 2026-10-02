import { ALL_CHAINS, CHAINS, zerodevRpc } from "./env"

async function rpc(url: string, method: string): Promise<unknown> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
        signal: AbortSignal.timeout(3000)
    })
    const json = (await res.json()) as { result?: unknown; error?: unknown }
    if (json.error) throw new Error(JSON.stringify(json.error))
    return json.result
}

export async function preflight() {
    const problems: string[] = []
    for (const key of ALL_CHAINS) {
        const { chain, rpcUrl } = CHAINS[key]
        try {
            const id = Number(await rpc(rpcUrl, "eth_chainId"))
            if (id !== chain.id) {
                problems.push(
                    `${key}: anvil reports chain ${id}, expected ${chain.id}`
                )
            }
        } catch {
            problems.push(`${key}: anvil not reachable at ${rpcUrl}`)
        }
        try {
            await rpc(zerodevRpc(key), "eth_supportedEntryPoints")
        } catch {
            problems.push(
                `${key}: gateway/UR not reachable at ${zerodevRpc(key)}`
            )
        }
    }
    if (problems.length > 0) {
        throw new Error(
            `Local e2e stack not running — run: bun run local:up\n  ${problems.join("\n  ")}`
        )
    }
}

await preflight()
