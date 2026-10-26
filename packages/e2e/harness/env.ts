import type { Chain } from "viem"
import { arbitrumSepolia, sepolia } from "viem/chains"

export type ChainKey = "sepolia" | "arbSepolia"

export const CHAINS: Record<ChainKey, { chain: Chain; rpcUrl: string }> = {
    sepolia: { chain: sepolia, rpcUrl: "http://127.0.0.1:8545" },
    arbSepolia: { chain: arbitrumSepolia, rpcUrl: "http://127.0.0.1:8546" }
}

export const ALL_CHAINS: readonly ChainKey[] = ["sepolia", "arbSepolia"]

// "sponsored": zero fees (UR project with gas policies).
// "unsponsored": real fees from UR (project without gas policies).
export type Project = "sponsored" | "unsponsored"

const GATEWAY_URL = "http://127.0.0.1:4000"

// Same URL shape as rpc.zerodev.app; the gateway only reads the project id
// to choose between sponsored and unsponsored fees.
export const zerodevRpc = (key: ChainKey, project: Project = "sponsored") =>
    `${GATEWAY_URL}/api/v3/${project}/chain/${CHAINS[key].chain.id}`
