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
