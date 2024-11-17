import {
    type Account,
    type Address,
    type Assign,
    type Chain,
    type Client,
    type EIP1193Provider,
    type Hex,
    type LocalAccount,
    type OneOf,
    type Transport,
    type TypedData,
    type TypedDataDefinition,
    type WalletClient,
    createNonceManager,
    encodeFunctionData
} from "viem"
import {
    type SmartAccount,
    type SmartAccountImplementation,
    entryPoint06Abi,
    entryPoint06Address,
    getUserOperationHash,
    toSmartAccount
} from "viem/account-abstraction"
import { toAccount } from "viem/accounts"
import { getChainId, signMessage } from "viem/actions"
import {
    getAccountNonce,
    getSenderAddress
} from "../../../actions/public/index.js"
import type { CallType, GetEntryPointAbi } from "../../../types/kernel.js"
import {
    MULTISEND_ADDRESS,
    encodeMultiSend,
    multiSendAbi
} from "../../utils/multisend.js"

export type KernelSmartAccountV1Implementation = Assign<
    SmartAccountImplementation<GetEntryPointAbi<"0.6">, "0.6">,
    {
        sign: NonNullable<SmartAccountImplementation["sign"]>
        encodeCalls: (
            calls: Parameters<SmartAccountImplementation["encodeCalls"]>[0],
            callType?: CallType | undefined
        ) => Promise<Hex>
        generateInitCode: () => Promise<Hex>
        encodeModuleInstallCallData: () => Promise<Hex>
    }
>

export type CreateKernelAccountV1ReturnType =
    SmartAccount<KernelSmartAccountV1Implementation>

const createAccountAbi = [
    {
        inputs: [
            { internalType: "address", name: "_owner", type: "address" },
            { internalType: "uint256", name: "_index", type: "uint256" }
        ],
        name: "createAccount",
        outputs: [
            {
                internalType: "contract EIP1967Proxy",
                name: "proxy",
                type: "address"
            }
        ],
        stateMutability: "nonpayable",
        type: "function"
    }
]

const executeAndRevertAbi = [
    {
        inputs: [
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
            { internalType: "bytes", name: "data", type: "bytes" },
            { internalType: "enum Operation", name: "operation", type: "uint8" }
        ],
        name: "executeAndRevert",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    }
]

const KERNEL_V1_ADDRESSES: {
    FACTORY_ADDRESS: Address
    ENTRYPOINT_V0_6: Address
} = {
    FACTORY_ADDRESS: "0x4E4946298614FC299B50c947289F4aD0572CB9ce",
    ENTRYPOINT_V0_6: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
}

export async function createKernelAccountV1(
    client: Client,
    {
        signer,
        address,
        entryPoint,
        index = 0n
    }: {
        signer: OneOf<
            | EIP1193Provider
            | WalletClient<Transport, Chain | undefined, Account>
            | LocalAccount
        >
        entryPoint: {
            address: Address
            version: "0.6"
        }
        address?: Address
        index?: bigint
    }
): Promise<CreateKernelAccountV1ReturnType> {
    const viemSigner: LocalAccount = {
        ...signer,
        signTransaction: (_, __) => {
            throw new Error(
                "Smart account signer doesn't need to sign transactions"
            )
        }
    } as LocalAccount

    // Fetch chain id
    const chainId = await getChainId(client)

    const generateInitCode = async (): Promise<Hex> => {
        return encodeFunctionData({
            abi: createAccountAbi,
            functionName: "createAccount",
            args: [signer.address, index]
        })
    }

    const getFactoryArgs = async () => {
        return {
            factory: KERNEL_V1_ADDRESSES.FACTORY_ADDRESS,
            factoryData: await generateInitCode()
        }
    }

    // Fetch account address and chain id
    let accountAddress =
        address ??
        (await (async () => {
            const { factory, factoryData } = await getFactoryArgs()

            // Get the sender address based on the init code
            return await getSenderAddress(client, {
                factory,
                factoryData,
                entryPointAddress: entryPoint.address
            })
        })())

    if (!accountAddress) throw new Error("Account address not found")

    const account = toAccount({
        address: accountAddress,
        async signMessage({ message }) {
            return viemSigner.signMessage({ message })
        },
        async signTransaction(_, __) {
            throw new Error(
                "Smart account signer doesn't need to sign transactions"
            )
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return viemSigner.signTypedData(typedData)
        }
    })

    const _entryPoint = {
        address: entryPoint?.address ?? entryPoint06Address,
        abi: entryPoint06Abi,
        version: entryPoint?.version ?? "0.6"
    }

    return toSmartAccount<KernelSmartAccountV1Implementation>({
        ...account,
        generateInitCode,
        encodeModuleInstallCallData: async () => {
            throw new Error("Not implemented")
        },
        nonceKeyManager: createNonceManager({
            source: { get: () => 0, set: () => {} }
        }),
        async sign({ hash }) {
            return account.signMessage({ message: hash })
        },
        async signMessage({ message }) {
            return account.signMessage({ message })
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return viemSigner.signTypedData(typedData)
        },
        async getAddress() {
            if (accountAddress) return accountAddress

            const { factory, factoryData } = await getFactoryArgs()

            // Get the sender address based on the init code
            accountAddress = await getSenderAddress(client, {
                factory,
                factoryData,
                entryPointAddress: entryPoint.address
            })

            return accountAddress
        },
        getFactoryArgs,
        client: client,
        entryPoint: _entryPoint,
        async getNonce() {
            return getAccountNonce(client, {
                address: accountAddress,
                entryPointAddress: entryPoint.address
            })
        },
        async signUserOperation(userOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    sender: userOperation.sender ?? (await this.getAddress()),
                    signature: "0x"
                },
                entryPointAddress: entryPoint.address,
                entryPointVersion: entryPoint.version,
                chainId: chainId
            })
            const signature = await signMessage(client, {
                account: viemSigner,
                message: { raw: hash }
            })
            return signature
        },
        // async getInitCode() {
        //     if (smartAccountDeployed) return "0x"

        //     smartAccountDeployed = await isSmartAccountDeployed(
        //         client,
        //         accountAddress
        //     )

        //     if (smartAccountDeployed) return "0x"
        //     return generateInitCode()
        // },
        async encodeCalls(calls, callType): Promise<Hex> {
            if (calls.length > 1) {
                if (callType === "delegatecall") {
                    throw new Error("Cannot batch delegatecall")
                }
                // Encode a batched call using multiSend
                const multiSendCallData = encodeFunctionData({
                    abi: multiSendAbi,
                    functionName: "multiSend",
                    args: [encodeMultiSend(calls)]
                })

                return encodeFunctionData({
                    abi: executeAndRevertAbi,
                    functionName: "executeAndRevert",
                    args: [MULTISEND_ADDRESS, 0n, multiSendCallData, 1n]
                })
            }

            const call = calls.length === 0 ? undefined : calls[0]

            if (!call) {
                throw new Error("No calls to encode")
            }

            // Default to `call`
            if (!callType || callType === "call") {
                if (call.to.toLowerCase() === accountAddress.toLowerCase()) {
                    return call.data || "0x"
                }

                return encodeFunctionData({
                    abi: executeAndRevertAbi,
                    functionName: "executeAndRevert",
                    args: [call.to, call.value || 0n, call.data, 0n]
                })
            }

            if (callType === "delegatecall") {
                return encodeFunctionData({
                    abi: executeAndRevertAbi,
                    functionName: "executeAndRevert",
                    args: [call.to, call.value || 0n, call.data, 1n]
                })
            }

            throw new Error("Invalid call type")
        },
        async getStubSignature() {
            return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
        }
    })
}
