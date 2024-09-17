import type { EntryPointVersion } from "permissionless/types"
import type { Chain } from "viem"
import {
    baseSepolia,
    optimismSepolia,
    polygonMumbai,
    sepolia
} from "viem/chains"

export const config: {
    [key in EntryPointVersion]: {
        [key in number]: {
            rpcUrl: string
            chainId: number
            bundlerUrl: string
            projectId: string
        }
    }
} = {
    "v0.6": {
        [sepolia.id]: {
            rpcUrl: process.env.RPC_URL_SEPOLIA || "",
            bundlerUrl: process.env.ZERODEV_BUNDLER_RPC_HOST_EPV07 || "",
            chainId: sepolia.id,
            projectId: process.env.ZERODEV_PROJECT_ID_SEPOLIA || ""
        }
    },
    "v0.7": {
        [sepolia.id]: {
            rpcUrl: process.env.RPC_URL_SEPOLIA || "",
            bundlerUrl: process.env.ZERODEV_BUNDLER_RPC_HOST_EPV07 || "",
            chainId: sepolia.id,
            projectId: process.env.ZERODEV_PROJECT_ID_SEPOLIA || ""
        },
        [optimismSepolia.id]: {
            rpcUrl: process.env.RPC_URL_OP_SEPOLIA || "",
            bundlerUrl: process.env.ZERODEV_BUNDLER_RPC_HOST_EPV07 || "",
            chainId: optimismSepolia.id,
            projectId: process.env.ZERODEV_PROJECT_ID_OP_SEPOLIA || ""
        },
        [baseSepolia.id]: {
            rpcUrl: process.env.RPC_URL_BASE_SEPOLIA || "",
            bundlerUrl: process.env.ZERODEV_BUNDLER_RPC_HOST_EPV07 || "",
            chainId: baseSepolia.id,
            projectId: process.env.ZERODEV_PROJECT_ID_BASE_SEPOLIA || ""
        }
    }
}

export const TOKEN_ACTION_ADDRESS = "0xA015bd458DbAc61c254104099f544dB6ef570c7C"
