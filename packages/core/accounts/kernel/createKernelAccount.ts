import { getAccountNonce, getAction, getSenderAddress } from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccount
} from "permissionless/accounts"
import {
    type Address,
    type Chain,
    type Client,
    type EncodeDeployDataParameters,
    type Hash,
    type Hex,
    type Transport,
    type TypedDataDefinition,
    concatHex,
    decodeFunctionResult,
    encodeAbiParameters,
    encodeDeployData,
    encodeFunctionData,
    getTypesForEIP712Domain,
    hashMessage,
    hashTypedData,
    keccak256,
    parseAbi,
    publicActions,
    stringToHex,
    validateTypedData
} from "viem"
import { toAccount } from "viem/accounts"
import { getBytecode, getStorageAt } from "viem/actions"
import { KERNEL_NAME } from "../../constants.js"
import type {
    KernelEncodeCallDataArgs,
    KernelPluginManager,
    KernelPluginManagerParams
} from "../../types/kernel.js"
import { getKernelVersion } from "../../utils.js"
import { wrapSignatureWith6492 } from "../utils/6492.js"
import { parseFactoryAddressAndCallDataFromAccountInitCode } from "../utils/index.js"
import {
    isKernelPluginManager,
    toKernelPluginManager
} from "../utils/toKernelPluginManager.js"
import { KernelExecuteAbi, KernelInitAbi } from "./abi/KernelAccountAbi.js"

export type KernelSmartAccount<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = SmartAccount<"kernelSmartAccount", transport, chain> & {
    kernelPluginManager: KernelPluginManager
    generateInitCode: () => Promise<Hex>
    encodeCallData: (args: KernelEncodeCallDataArgs) => Promise<Hex>
}

/**
 * The account creation ABI for a kernel smart account (from the KernelFactory)
 */
const createAccountAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "_implementation",
                type: "address"
            },
            {
                internalType: "bytes",
                name: "_data",
                type: "bytes"
            },
            {
                internalType: "uint256",
                name: "_index",
                type: "uint256"
            }
        ],
        name: "createAccount",
        outputs: [
            {
                internalType: "address",
                name: "proxy",
                type: "address"
            }
        ],
        stateMutability: "payable",
        type: "function"
    }
] as const

// Safe's library for create and create2: https://github.com/safe-global/safe-contracts/blob/0acdd35a203299585438f53885df630f9d486a86/contracts/libraries/CreateCall.sol
// Address was found here: https://github.com/safe-global/safe-deployments/blob/926ec6bbe2ebcac3aa2c2c6c0aff74aa590cbc6a/src/assets/v1.4.1/create_call.json
const createCallAddress = "0x9b35Af71d77eaf8d7e40252370304687390A1A52"

const createCallAbi = parseAbi([
    "function performCreate(uint256 value, bytes memory deploymentData) public returns (address newContract)",
    "function performCreate2(uint256 value, bytes memory deploymentData, bytes32 salt) public returns (address newContract)"
])

export const EIP1271ABI = [
    {
        type: "function",
        name: "eip712Domain",
        inputs: [],
        outputs: [
            { name: "fields", type: "bytes1", internalType: "bytes1" },
            { name: "name", type: "string", internalType: "string" },
            { name: "version", type: "string", internalType: "string" },
            { name: "chainId", type: "uint256", internalType: "uint256" },
            {
                name: "verifyingContract",
                type: "address",
                internalType: "address"
            },
            { name: "salt", type: "bytes32", internalType: "bytes32" },
            { name: "extensions", type: "uint256[]", internalType: "uint256[]" }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "isValidSignature",
        inputs: [
            { name: "data", type: "bytes32", internalType: "bytes32" },
            { name: "signature", type: "bytes", internalType: "bytes" }
        ],
        outputs: [
            { name: "magicValue", type: "bytes4", internalType: "bytes4" }
        ],
        stateMutability: "view"
    }
] as const
/**
 * Default addresses for kernel smart account
 */
export const KERNEL_ADDRESSES: {
    ACCOUNT_LOGIC: Address
    FACTORY_ADDRESS: Address
    ENTRYPOINT_V0_6: Address
} = {
    ACCOUNT_LOGIC: "0xd3082872F8B06073A021b4602e022d5A070d7cfC",
    FACTORY_ADDRESS: "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3",
    ENTRYPOINT_V0_6: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
}

/**
 * Get the account initialization code for a kernel smart account
 * @param index
 * @param factoryAddress
 * @param accountLogicAddress
 * @param ecdsaValidatorAddress
 */
const getAccountInitCode = async ({
    index,
    factoryAddress,
    accountLogicAddress,
    validatorAddress,
    enableData
}: {
    index: bigint
    factoryAddress: Address
    accountLogicAddress: Address
    validatorAddress: Address
    enableData: Hex
}): Promise<Hex> => {
    // Build the account initialization data
    const initialisationData = encodeFunctionData({
        abi: KernelInitAbi,
        functionName: "initialize",
        args: [validatorAddress, enableData]
    })

    // Build the account init code
    return concatHex([
        factoryAddress,
        encodeFunctionData({
            abi: createAccountAbi,
            functionName: "createAccount",
            args: [accountLogicAddress, initialisationData, index]
        }) as Hex
    ])
}

/**
 * Check the validity of an existing account address, or fetch the pre-deterministic account address for a kernel smart wallet
 * @param client
 * @param entryPoint
 * @param initCodeProvider
 */
const getAccountAddress = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>({
    client,
    entryPoint,
    initCodeProvider
}: {
    client: Client<TTransport, TChain, undefined>
    initCodeProvider: () => Promise<Hex>
    entryPoint: Address
}): Promise<Address> => {
    // Find the init code for this account
    const initCode = await initCodeProvider()

    // Get the sender address based on the init code
    return getSenderAddress(client, {
        initCode,
        entryPoint
    })
}

/**
 * Build a kernel smart account from a private key, that use the ECDSA signer behind the scene
 * @param client
 * @param privateKey
 * @param entryPoint
 * @param index
 * @param factoryAddress
 * @param accountLogicAddress
 * @param ecdsaValidatorAddress
 * @param deployedAccountAddress
 */
export async function createKernelAccount<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        plugins,
        entryPoint = KERNEL_ADDRESSES.ENTRYPOINT_V0_6,
        index = 0n,
        factoryAddress = KERNEL_ADDRESSES.FACTORY_ADDRESS,
        accountLogicAddress = KERNEL_ADDRESSES.ACCOUNT_LOGIC,
        deployedAccountAddress
    }: {
        plugins: KernelPluginManagerParams | KernelPluginManager
        entryPoint?: Address
        index?: bigint
        factoryAddress?: Address
        accountLogicAddress?: Address
        deployedAccountAddress?: Address
    }
): Promise<KernelSmartAccount<TTransport, TChain>> {
    const kernelPluginManager = isKernelPluginManager(plugins)
        ? plugins
        : await toKernelPluginManager(client, {
              sudo: plugins.sudo,
              regular: plugins.regular,
              executorData: plugins.executorData,
              pluginEnableSignature: plugins.pluginEnableSignature
          })
    // Helper to generate the init code for the smart account
    const generateInitCode = async () => {
        const validatorInitData =
            await kernelPluginManager.getValidatorInitData()
        return getAccountInitCode({
            index,
            factoryAddress,
            accountLogicAddress,
            validatorAddress: validatorInitData.validatorAddress,
            enableData: validatorInitData.enableData
        })
    }

    // Fetch account address and chain id
    const accountAddress =
        deployedAccountAddress ??
        (await getAccountAddress<TTransport, TChain>({
            client,
            entryPoint,
            initCodeProvider: generateInitCode
        }))

    if (!accountAddress) throw new Error("Account address not found")

    const signHashedMessage = async (messageHash: Hex): Promise<Hex> => {
        let kernelImplAddr: Address | undefined
        try {
            const strgAddr = await getAction(
                client,
                getStorageAt
            )({
                address: accountAddress,
                slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
            })
            if (strgAddr) kernelImplAddr = `0x${strgAddr.slice(26)}` as Hex
        } catch (error) {}
        const kernelVersion = getKernelVersion(kernelImplAddr)
        if (kernelVersion !== "0.2.3" && kernelVersion !== "0.2.4") {
            return kernelPluginManager.signMessage({
                message: {
                    raw: messageHash
                }
            })
        }

        const domain = await client.request({
            method: "eth_call",
            params: [
                {
                    to: accountAddress,
                    data: encodeFunctionData({
                        abi: EIP1271ABI,
                        functionName: "eip712Domain"
                    })
                },
                "latest"
            ]
        })

        let name: string
        let version: string
        let chainId: bigint

        if (domain !== "0x") {
            const decoded = decodeFunctionResult({
                abi: [...EIP1271ABI],
                functionName: "eip712Domain",
                data: domain
            })

            name = decoded[1]
            version = decoded[2]
            chainId = decoded[3]
        } else {
            name = KERNEL_NAME
            version = kernelVersion
            chainId = client.chain
                ? BigInt(client.chain.id)
                : BigInt(await client.extend(publicActions).getChainId())
        }

        const encoded = encodeAbiParameters(
            [
                { type: "bytes32" },
                { type: "bytes32" },
                { type: "bytes32" },
                { type: "uint256" },
                { type: "address" }
            ],
            [
                keccak256(
                    stringToHex(
                        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                    )
                ),
                keccak256(stringToHex(name)),
                keccak256(stringToHex(version)),
                BigInt(chainId),
                accountAddress
            ]
        )

        const domainSeparator = keccak256(encoded)
        const digest = keccak256(
            concatHex(["0x1901", domainSeparator, messageHash])
        )
        return kernelPluginManager.signMessage({
            message: {
                raw: digest
            }
        })
    }

    // Build the EOA Signer
    const account = toAccount({
        address: accountAddress,
        async signMessage({ message }) {
            const messageHash = hashMessage(message)
            const [isDeployed, signature] = await Promise.all([
                isAccountDeployed(),
                signHashedMessage(messageHash)
            ])
            return create6492Signature(isDeployed, signature)
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount()
        },
        async signTypedData(typedData) {
            const types = {
                EIP712Domain: getTypesForEIP712Domain({
                    domain: typedData.domain
                }),
                ...typedData.types
            }

            // Need to do a runtime validation check on addresses, byte ranges, integer ranges, etc
            // as we can't statically check this with TypeScript.
            validateTypedData({
                domain: typedData.domain,
                message: typedData.message,
                primaryType: typedData.primaryType,
                types: types
            } as TypedDataDefinition)

            const typedHash = hashTypedData(typedData)
            const [isDeployed, signature] = await Promise.all([
                isAccountDeployed(),
                signHashedMessage(typedHash)
            ])
            return create6492Signature(isDeployed, signature)
        }
    })

    const isAccountDeployed = async (): Promise<boolean> => {
        const contractCode = await getBytecode(client, {
            address: accountAddress
        })

        return (contractCode?.length ?? 0) > 2
    }

    const create6492Signature = async (
        isDeployed: boolean,
        signature: Hash
    ): Promise<Hash> => {
        if (isDeployed) {
            return signature
        }

        const [factoryAddress, factoryCalldata] =
            parseFactoryAddressAndCallDataFromAccountInitCode(
                await generateInitCode()
            )

        return wrapSignatureWith6492({
            factoryAddress,
            factoryCalldata,
            signature
        })
    }

    return {
        ...account,
        client: client,
        publicKey: accountAddress,
        entryPoint: entryPoint,
        source: "kernelSmartAccount",
        kernelPluginManager,
        generateInitCode,

        // Get the nonce of the smart account
        async getNonce() {
            const key = await kernelPluginManager.getNonceKey()
            return getAccountNonce(client, {
                sender: accountAddress,
                entryPoint: entryPoint,
                key
            })
        },

        // Sign a user operation
        async signUserOperation(userOperation) {
            return kernelPluginManager.signUserOperation(userOperation)
        },

        // Encode the init code
        async getInitCode() {
            if (await isAccountDeployed()) {
                return "0x"
            } else {
                return generateInitCode()
            }
        },

        // Encode the deploy call data
        async encodeDeployCallData(_tx) {
            return encodeFunctionData({
                abi: KernelExecuteAbi,
                functionName: "executeDelegateCall",
                args: [
                    createCallAddress,
                    encodeFunctionData({
                        abi: createCallAbi,
                        functionName: "performCreate",
                        args: [
                            0n,
                            encodeDeployData({
                                abi: _tx.abi,
                                bytecode: _tx.bytecode,
                                args: _tx.args
                            } as EncodeDeployDataParameters)
                        ]
                    })
                ]
            })
        },

        // Encode a call
        async encodeCallData(_tx) {
            const tx = _tx as KernelEncodeCallDataArgs
            if (Array.isArray(tx)) {
                // Encode a batched call
                return encodeFunctionData({
                    abi: KernelExecuteAbi,
                    functionName: "executeBatch",
                    args: [
                        tx.map((txn) => {
                            if (txn.callType === "delegatecall") {
                                throw new Error("Cannot batch delegatecall")
                            }
                            return {
                                to: txn.to,
                                value: txn.value,
                                data: txn.data
                            }
                        })
                    ]
                })
            }

            // Default to `call`
            if (!tx.callType || tx.callType === "call") {
                if (tx.to.toLowerCase() === accountAddress.toLowerCase()) {
                    return tx.data
                }
                return encodeFunctionData({
                    abi: KernelExecuteAbi,
                    functionName: "execute",
                    args: [tx.to, tx.value, tx.data, 0]
                })
            }

            if (tx.callType === "delegatecall") {
                return encodeFunctionData({
                    abi: KernelExecuteAbi,
                    functionName: "executeDelegateCall",
                    args: [tx.to, tx.data]
                })
            }

            throw new Error("Invalid call type")
        },

        // Get simple dummy signature
        async getDummySignature(userOperation) {
            return kernelPluginManager.getDummySignature(userOperation)
        }
    }
}
