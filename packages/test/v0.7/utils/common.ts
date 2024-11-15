import {
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import {
    http,
    type Address,
    type Chain,
    type Log,
    type PublicClient,
    type Transport,
    createPublicClient,
    decodeEventLog,
    encodeFunctionData
} from "viem"
import {
    type SmartAccount,
    entryPoint07Address
} from "viem/account-abstraction"
import * as allChains from "viem/chains"
import { EntryPointAbi } from "../../abis/EntryPoint"
import { TEST_ERC20Abi } from "../../abis/Test_ERC20Abi"
import { config } from "../../config"

export const Test_ERC20Address = "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"
const testingChain = allChains.sepolia.id
export const kernelVersion = "0.3.1"
export const index = 11111111111111111n // 432334375434333332434365532464445487823332432423423n
const DEFAULT_PROVIDER = "ALCHEMY"
const projectId = config["0.7"][testingChain].projectId

export const getEntryPoint = (): {
    address: Address
    version: "0.7"
} => {
    return { address: entryPoint07Address, version: "0.7" }
}

export const getTestingChain = (chainId?: number): Chain => {
    const _chainId = chainId ?? testingChain
    const chain = Object.values(allChains).find((c) => c.id === _chainId)
    if (!chain) {
        throw new Error(`Chain ${testingChain} not found`)
    }
    return chain
}

export const getPublicClient = async (chain?: number) => {
    const rpcUrl = config["0.7"][chain ?? testingChain].rpcUrl
    if (!rpcUrl) {
        throw new Error("RPC_URL environment variable not set")
    }

    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: getTestingChain(chain)
    })

    const chainId = await publicClient.getChainId()

    return publicClient
}

export const getZeroDevPaymasterClient = () => {
    if (!process.env.ZERODEV_PAYMASTER_RPC_HOST)
        throw new Error(
            "ZERODEV_PAYMASTER_RPC_HOST environment variable not set"
        )
    if (!projectId)
        throw new Error("ZERODEV_PROJECT_ID environment variable not set")

    const chain = getTestingChain()

    return createZeroDevPaymasterClient({
        chain: chain,
        transport: http(getPaymasterRpc()),
        entryPoint: getEntryPoint()
    })
}

export const getBundlerRpc = (_projectId?: string): string => {
    const zeroDevProjectId = _projectId ?? projectId
    const zeroDevBundlerRpcHost = config["0.7"][testingChain].bundlerUrl
    if (!zeroDevProjectId || !zeroDevBundlerRpcHost) {
        throw new Error(
            "ZERODEV_PROJECT_ID and ZERODEV_BUNDLER_RPC_HOST environment variables must be set"
        )
    }

    return `${zeroDevBundlerRpcHost}/${zeroDevProjectId}?provider=${DEFAULT_PROVIDER}`
}

export const getPaymasterRpc = (_projectId?: string): string => {
    const zeroDevProjectId = _projectId ?? projectId
    const zeroDevPaymasterRpcHost = process.env.ZERODEV_PAYMASTER_RPC_HOST
    if (!zeroDevProjectId || !zeroDevPaymasterRpcHost) {
        throw new Error(
            "ZERODEV_PROJECT_ID and ZERODEV_PAYMASTER_RPC_HOST environment variables must be set"
        )
    }

    return `${zeroDevPaymasterRpcHost}/${zeroDevProjectId}?provider=${DEFAULT_PROVIDER}`
}

export const findUserOperationEvent = (logs: Log[]): boolean => {
    return logs.some((log) => {
        try {
            const event = decodeEventLog({
                abi: EntryPointAbi,
                ...log
            })
            return event.eventName === "UserOperationEvent"
        } catch {
            return false
        }
    })
}

export const getUserOperationEvent = (logs: Log[]) => {
    for (const log of logs) {
        try {
            const event = decodeEventLog({
                abi: EntryPointAbi,
                ...log
            })
            console.log("event", event)
            if (event.eventName === "UserOperationEvent") return event
        } catch {}
    }
}

export async function mintToAccount(
    publicClient: PublicClient,
    ecdsaSmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >,
    target: Address,
    amount: bigint
) {
    const balanceBefore = await publicClient.readContract({
        abi: TEST_ERC20Abi,
        address: Test_ERC20Address,
        functionName: "balanceOf",
        args: [target]
    })

    console.log("balanceBefore of account", balanceBefore)

    const amountToMint = balanceBefore > amount ? 0n : amount

    const mintData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        functionName: "mint",
        args: [target, amountToMint]
    })

    if (amountToMint > 0n) {
        const mintTransactionHash =
            await ecdsaSmartAccountClient.sendTransaction({
                to: Test_ERC20Address,
                data: mintData
            })
        console.log({ mintTransactionHash })

        const balanceAfter = await publicClient.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [target]
        })

        console.log("balanceAfter of account", balanceAfter)

        console.log(
            "mintTransactionHash",
            `https://sepolia.etherscan.io/tx/${mintTransactionHash}`
        )
    }
}

export const validateEnvironmentVariables = (envVars: string[]): void => {
    const unsetEnvVars = envVars.filter((envVar) => !process.env[envVar])
    if (unsetEnvVars.length > 0) {
        throw new Error(
            `The following environment variables are not set: ${unsetEnvVars.join(
                ", "
            )}`
        )
    }
}

export const sleep = async (milliseconds: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export const waitForNonceUpdate = async (): Promise<void> => {
    return sleep(10000)
}
