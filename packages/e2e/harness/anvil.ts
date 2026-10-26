import { http, type Address, createTestClient } from "viem"
import { getPublicClient } from "./clients"
import { CHAINS, type ChainKey } from "./env"

const testClient = (key: ChainKey) =>
    createTestClient({
        mode: "anvil",
        chain: CHAINS[key].chain,
        transport: http(CHAINS[key].rpcUrl)
    })

export async function setBalance(key: ChainKey, address: Address, wei: bigint) {
    await testClient(key).setBalance({ address, value: wei })
}

// Moves time for every later test on this chain: time-based tests must use
// chainTime(), never Date.now().
export async function increaseTime(key: ChainKey, seconds: number) {
    await testClient(key).increaseTime({ seconds })
    await testClient(key).mine({ blocks: 1 })
}

export async function chainTime(key: ChainKey): Promise<number> {
    const block = await getPublicClient(key).getBlock()
    return Number(block.timestamp)
}

export async function mine(key: ChainKey) {
    await testClient(key).mine({ blocks: 1 })
}

// Moves this fork's clock up to wall-clock time (never back). Policies that
// return validity windows are checked by the bundler against its wall clock.
// Only arbSepolia can be synced: tests time-travel sepolia ahead of wall time.
export async function syncClockToWall(key: ChainKey) {
    await mine(key)
    const behind = Math.floor(Date.now() / 1000) - (await chainTime(key)) - 2
    if (behind < -2) {
        throw new Error(`${key} clock is ahead of wall time; restart the stack`)
    }
    if (behind > 0) await increaseTime(key, behind)
}
