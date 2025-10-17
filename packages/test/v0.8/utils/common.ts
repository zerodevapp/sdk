import {
    type ZeroDevPaymasterClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { http, type Address, type Chain, createPublicClient } from "viem"
import { entryPoint08Address } from "viem/account-abstraction"
import * as allChains from "viem/chains"
import { config } from "../../config"

// const
const zerodevRpcHost = "https://rpc.zerodev.app/api/v3"
export const defaultChainId = allChains.sepolia.id
export const defaultIndex = 11111111111111111n // 432334375434333332434365532464445487823332432423423n
export const defaultKernelVersion = "0.4.0"
const entryPointVersion = "0.8"
const entryPointAddress = entryPoint08Address

export const getProjectId = (_chainId: number): string => {
    const projectId = process.env.ZERODEV_V3_PROJECT_ID
    if (!projectId) {
        throw new Error("ZERODEV_V3_PROJECT_ID environment variable not set")
    }
    return projectId
}

export const getEntryPoint = (): {
    address: Address
    version: "0.8"
} => {
    return { address: entryPointAddress, version: entryPointVersion }
}

export const getTestingChain = (chainId?: number): Chain => {
    const _chainId = chainId ?? defaultChainId
    const chain = Object.values(allChains).find((c) => c.id === _chainId)
    if (!chain) {
        throw new Error(`Chain ${_chainId} not found`)
    }
    return chain
}

export const getPublicClient = async (_chainId?: number) => {
    const chainId = _chainId ?? defaultChainId
    const rpcUrl = config["0.8"][chainId].rpcUrl
    const chain = getTestingChain(chainId)
    if (!rpcUrl) {
        throw new Error("RPC_URL environment variable not set")
    }

    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: chain
    })

    return publicClient
}

export const getZeroDevRpc = (_chainId: number, _projectId: string): string => {
    return `${zerodevRpcHost}/${_projectId}/chain/${_chainId}`
}

export const getZeroDevPaymasterClient = (
    _chainId?: number
): ZeroDevPaymasterClient => {
    const chainId = _chainId ?? defaultChainId
    const projectId = getProjectId(chainId)
    if (!projectId)
        throw new Error("ZERODEV_PROJECT_ID environment variable not set")

    const chain = getTestingChain(chainId)

    return createZeroDevPaymasterClient({
        chain: chain,
        transport: http(getZeroDevRpc(chainId, projectId))
    })
}
