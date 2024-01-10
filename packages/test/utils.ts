import {
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@kerneljs/core"
import { createKernelAccount } from "@kerneljs/core/accounts"
import { signerToEcdsaValidator } from "@kerneljs/ecdsa-validator"
import {
    ParamOperator,
    accountToSerializedSessionKeyAccountParams,
    serializedSessionKeyAccountParamsToAccount,
    signerToSessionKeyValidator
} from "@kerneljs/session-key"
import {
    BundlerClient,
    createBundlerClient,
    createSmartAccountClient
} from "permissionless"
import {
    type SmartAccount,
    signerToSimpleSmartAccount
} from "permissionless/accounts"
import { SponsorUserOperationMiddleware } from "permissionless/actions/smartAccount"
import {
    createPimlicoBundlerClient,
    createPimlicoPaymasterClient
} from "permissionless/clients/pimlico"
import {
    http,
    AbiItem,
    Address,
    Hex,
    type Log,
    type PublicClient,
    type WalletClient,
    createPublicClient,
    createWalletClient,
    decodeEventLog,
    encodeFunctionData
} from "viem"
import {
    type Account,
    generatePrivateKey,
    privateKeyToAccount
} from "viem/accounts"
import { type Chain, goerli } from "viem/chains"
import * as allChains from "viem/chains"
import { EntryPointAbi } from "./abis/EntryPoint.js"
import { TEST_ERC20Abi } from "./abis/Test_ERC20Abi.js"

export const getFactoryAddress = (): Address => {
    const factoryAddress = process.env.FACTORY_ADDRESS
    if (!factoryAddress) {
        throw new Error("FACTORY_ADDRESS environment variable not set")
    }
    return factoryAddress as Address
}

export const getPrivateKeyAccount = (): Account => {
    const privateKey = process.env.TEST_PRIVATE_KEY
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }
    return privateKeyToAccount(privateKey as Hex)
}

export const getTestingChain = (): Chain => {
    const testChainId = process.env.TEST_CHAIN_ID
    const chainId = testChainId ? parseInt(testChainId, 10) : goerli.id
    const chain = Object.values(allChains).find((c) => c.id === chainId)
    if (!chain) {
        throw new Error(`Chain with id ${chainId} not found`)
    }
    return chain
}

export const getSignerToSimpleSmartAccount =
    async (): Promise<SmartAccount> => {
        const privateKey = process.env.TEST_PRIVATE_KEY as Hex
        if (!privateKey) {
            throw new Error("TEST_PRIVATE_KEY environment variable not set")
        }

        const publicClient = await getPublicClient()
        const signer = privateKeyToAccount(privateKey)

        return signerToSimpleSmartAccount(publicClient, {
            entryPoint: getEntryPoint(),
            factoryAddress: getFactoryAddress(),
            signer: { ...signer, source: "local" as "local" | "external" }
        })
    }

export const getSignerToEcdsaKernelAccount =
    async (): Promise<SmartAccount> => {
        const privateKey = process.env.TEST_PRIVATE_KEY as Hex
        if (!privateKey) {
            throw new Error("TEST_PRIVATE_KEY environment variable not set")
        }

        const publicClient = await getPublicClient()
        const signer = privateKeyToAccount(privateKey)
        const ecdsaValidatorPlugin = await signerToEcdsaValidator(
            publicClient,
            {
                entryPoint: getEntryPoint(),
                signer: { ...signer, source: "local" as "local" | "external" }
            }
        )

        return createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            defaultValidator: ecdsaValidatorPlugin,
            index: 21312223n
        })
    }

export const getSignerToSessionKeyKernelAccount =
    async (): Promise<SmartAccount> => {
        const privateKey = process.env.TEST_PRIVATE_KEY as Hex
        if (!privateKey) {
            throw new Error("TEST_PRIVATE_KEY environment variable not set")
        }

        const publicClient = await getPublicClient()
        const signer = privateKeyToAccount(privateKey)
        const sessionKey = privateKeyToAccount(generatePrivateKey())
        const ecdsaValidatorPlugin = await signerToEcdsaValidator(
            publicClient,
            {
                entryPoint: getEntryPoint(),
                signer: { ...signer, source: "local" as "local" | "external" }
            }
        )

        const sessionKeyPlugin = await signerToSessionKeyValidator(
            publicClient,
            {
                signer: sessionKey,
                validatorData: {
                    permissions: [
                        {
                            target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
                            abi: TEST_ERC20Abi,
                            functionName: "transfer",
                            args: [
                                {
                                    operator: ParamOperator.EQUAL,
                                    value: signer.address
                                },
                                null
                            ]
                        }
                    ]
                }
            }
        )

        const account = await createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            defaultValidator: ecdsaValidatorPlugin,
            plugin: sessionKeyPlugin,
            index: 21312223n
        })

        const serializedSessionKeyAccountParams =
            await accountToSerializedSessionKeyAccountParams(account)

        return await serializedSessionKeyAccountParamsToAccount(
            publicClient,
            serializedSessionKeyAccountParams,
            sessionKey
        )
    }

export const getKernelAccountClient = async ({
    account,
    sponsorUserOperation
}: SponsorUserOperationMiddleware & {
    account?: SmartAccount
} = {}) => {
    if (!process.env.ZERODEV_PAYMASTER_RPC_HOST)
        throw new Error(
            "ZERODEV_PAYMASTER_RPC_HOST environment variable not set"
        )
    if (!process.env.ZERODEV_PROJECT_ID)
        throw new Error("ZERODEV_PROJECT_ID environment variable not set")
    const zeroDevProjectId = process.env.ZERODEV_PROJECT_ID
    const zeroDevBundlerRpcHost = process.env.ZERODEV_BUNDLER_RPC_HOST

    const chain = getTestingChain()
    const resolvedAccount = account ?? (await getSignerToSimpleSmartAccount())

    return createKernelAccountClient({
        account: resolvedAccount,
        chain,
        transport: http(
            `${zeroDevBundlerRpcHost}/${zeroDevProjectId}?bundlerProvider=ALCHEMY`
        ),
        sponsorUserOperation
    })
}

export const getEoaWalletClient = (): WalletClient => {
    const rpcUrl = process.env.RPC_URL
    if (!rpcUrl) {
        throw new Error("RPC_URL environment variable not set")
    }

    return createWalletClient({
        account: getPrivateKeyAccount(),
        chain: getTestingChain(),
        transport: http(rpcUrl)
    })
}

export const getEntryPoint = (): Address => {
    const entryPointAddress = process.env.ENTRYPOINT_ADDRESS as Address
    if (!entryPointAddress) {
        throw new Error("ENTRYPOINT_ADDRESS environment variable not set")
    }
    return entryPointAddress
}

export const getPublicClient = async (): Promise<PublicClient> => {
    const rpcUrl = process.env.RPC_URL
    if (!rpcUrl) {
        throw new Error("RPC_URL environment variable not set")
    }

    const publicClient = createPublicClient({
        transport: http(rpcUrl)
    })

    const chainId = await publicClient.getChainId()
    const testingChain = getTestingChain()

    if (chainId !== testingChain.id) {
        throw new Error(
            `Testing Chain ID (${testingChain.id}) not supported by RPC URL`
        )
    }

    return publicClient
}

export const getBundlerClient = (): BundlerClient => {
    const pimlicoApiKey = process.env.PIMLICO_API_KEY
    const pimlicoBundlerRpcHost = process.env.PIMLICO_BUNDLER_RPC_HOST
    if (!pimlicoApiKey || !pimlicoBundlerRpcHost) {
        throw new Error(
            "PIMLICO_API_KEY and PIMLICO_BUNDLER_RPC_HOST environment variables must be set"
        )
    }

    const chain = getTestingChain()

    return createBundlerClient({
        chain,
        transport: http(`${pimlicoBundlerRpcHost}?apikey=${pimlicoApiKey}`)
    })
}

export const getKernelBundlerClient = (): BundlerClient => {
    const zeroDevProjectId = process.env.ZERODEV_PROJECT_ID
    const zeroDevBundlerRpcHost = process.env.ZERODEV_BUNDLER_RPC_HOST
    if (!zeroDevProjectId || !zeroDevBundlerRpcHost) {
        throw new Error(
            "ZERODEV_PROJECT_ID and ZERODEV_BUNDLER_RPC_HOST environment variables must be set"
        )
    }

    const chain = getTestingChain()

    return createBundlerClient({
        chain,
        transport: http(`${zeroDevBundlerRpcHost}/${zeroDevProjectId}`)
    })
}

export const getPimlicoBundlerClient = () => {
    if (!process.env.PIMLICO_BUNDLER_RPC_HOST)
        throw new Error("PIMLICO_BUNDLER_RPC_HOST environment variable not set")
    if (!process.env.PIMLICO_API_KEY)
        throw new Error("PIMLICO_API_KEY environment variable not set")
    const pimlicoApiKey = process.env.PIMLICO_API_KEY

    const chain = getTestingChain()

    return createPimlicoBundlerClient({
        chain: chain,
        transport: http(
            `${process.env.PIMLICO_BUNDLER_RPC_HOST}?apikey=${pimlicoApiKey}`
        )
    })
}

export const getPimlicoPaymasterClient = () => {
    if (!process.env.PIMLICO_PAYMASTER_RPC_HOST)
        throw new Error(
            "PIMLICO_PAYMASTER_RPC_HOST environment variable not set"
        )
    if (!process.env.PIMLICO_API_KEY)
        throw new Error("PIMLICO_API_KEY environment variable not set")
    const pimlicoApiKey = process.env.PIMLICO_API_KEY

    const chain = getTestingChain()

    return createPimlicoPaymasterClient({
        chain: chain,
        transport: http(
            `${process.env.PIMLICO_PAYMASTER_RPC_HOST}?apikey=${pimlicoApiKey}`
        )
    })
}

export const getZeroDevPaymasterClient = () => {
    if (!process.env.ZERODEV_PAYMASTER_RPC_HOST)
        throw new Error(
            "ZERODEV_PAYMASTER_RPC_HOST environment variable not set"
        )
    if (!process.env.ZERODEV_PROJECT_ID)
        throw new Error("ZERODEV_PROJECT_ID environment variable not set")
    const zeroDevProjectId = process.env.ZERODEV_PROJECT_ID

    const chain = getTestingChain()

    return createZeroDevPaymasterClient({
        chain: chain,
        transport: http(
            `${process.env.ZERODEV_PAYMASTER_RPC_HOST}/${zeroDevProjectId}?paymasterProvider=ALCHEMY`
        )
    })
}

export const isAccountDeployed = async (
    accountAddress: Address
): Promise<boolean> => {
    const publicClient = await getPublicClient()
    const contractCode = await publicClient.getBytecode({
        address: accountAddress
    })
    return (contractCode?.length ?? 0) > 2
}

export const getDummySignature = (): Hex => {
    return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
}

export const getOldUserOpHash = (): Hex => {
    return "0xe9fad2cd67f9ca1d0b7a6513b2a42066784c8df938518da2b51bb8cc9a89ea34"
}

export const sleep = async (milliseconds: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export const waitForNonceUpdate = async (): Promise<void> => {
    return sleep(10000)
}

export const generateApproveCallData = (paymasterAddress: Address): Hex => {
    const maxUint256 = BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    )
    const approveAbi: AbiItem[] = [
        {
            inputs: [
                { name: "_spender", type: "address" },
                { name: "_value", type: "uint256" }
            ],
            name: "approve",
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function"
        }
    ]

    return encodeFunctionData({
        abi: approveAbi,
        functionName: "approve",
        args: [paymasterAddress, maxUint256]
    })
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
