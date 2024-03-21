import {
    getAccountNonce,
    getEntryPointVersion,
    getSenderAddress,
    isSmartAccountDeployed
} from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccount
} from "permissionless/accounts"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    ENTRYPOINT_ADDRESS_V07_TYPE,
    EntryPoint
} from "permissionless/types"
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
    validateTypedData,
    zeroAddress,
    parseAbiParameters,
    pad
} from "viem"
import { toAccount } from "viem/accounts"
import { CALL_TYPE, EXEC_TYPE, KERNEL_NAME } from "../../constants.js"
import type {
    KernelEncodeCallDataArgs,
    KernelPluginManager,
    KernelPluginManagerParams
} from "../../types/kernel.js"
import {
    KERNEL_FEATURES,
    getExecMode,
    getKernelVersion,
    hasKernelFeature
} from "../../utils.js"
import {
    getKernelImplementationAddress,
    wrapSignatureWith6492
} from "../utils/6492.js"
import {
    isKernelPluginManager,
    toKernelPluginManager
} from "../utils/toKernelPluginManager.js"
import { KernelExecuteAbi, KernelInitAbi } from "./abi/KernelAccountAbi.js"
import {
    KernelV3ExecuteAbi,
    KernelV3InitAbi
} from "./abi/kernel_v_3_0_0/KernelAccountAbi.js"

export type KernelSmartAccount<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = SmartAccount<entryPoint, "kernelSmartAccount", transport, chain> & {
    kernelPluginManager: KernelPluginManager<entryPoint>
    generateInitCode: () => Promise<Hex>
    encodeCallData: (args: KernelEncodeCallDataArgs) => Promise<Hex>
}

export type CreateKernelAccountParameters<entryPoint extends EntryPoint> = {
    plugins:
        | KernelPluginManagerParams<entryPoint>
        | KernelPluginManager<entryPoint>
    entryPoint: entryPoint
    index?: bigint
    factoryAddress?: Address
    accountLogicAddress?: Address
    deployedAccountAddress?: Address
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
    ACCOUNT_LOGIC_V0_6: Address
    ACCOUNT_LOGIC_V0_7: Address
    FACTORY_ADDRESS: Address
    ENTRYPOINT_V0_6: Address
} = {
    ACCOUNT_LOGIC_V0_6: "0xd3082872F8B06073A021b4602e022d5A070d7cfC",
    ACCOUNT_LOGIC_V0_7: "0x079D5D8A3275A230AF743cB59c341Ff74B82488D",
    FACTORY_ADDRESS: "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3",
    ENTRYPOINT_V0_6: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
}

const getKernelInitData = <entryPoint extends EntryPoint>({
    validatorAddress,
    enableData,
    entryPoint: entryPointAddress
}: {
    validatorAddress: Address
    enableData: Hex
    entryPoint: entryPoint
}) => {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)

    if (entryPointVersion === "v0.6") {
        return encodeFunctionData({
            abi: KernelInitAbi,
            functionName: "initialize",
            args: [validatorAddress, enableData]
        })
    }

    return encodeFunctionData({
        abi: KernelV3InitAbi,
        functionName: "initialize",
        args: [
            pad(concatHex(["0x1", validatorAddress]), {
                size: 21,
                dir: "left"
            }),
            zeroAddress,
            enableData,
            "0x"
        ]
    })
}

/**
 * Get the account initialization code for a kernel smart account
 * @param index
 * @param factoryAddress
 * @param accountLogicAddress
 * @param ecdsaValidatorAddress
 */
const getAccountInitCode = async <entryPoint extends EntryPoint>({
    index,
    factoryAddress,
    accountLogicAddress,
    validatorAddress,
    enableData,
    entryPoint: entryPointAddress
}: {
    index: bigint
    factoryAddress: Address
    accountLogicAddress: Address
    validatorAddress: Address
    enableData: Hex
    entryPoint: entryPoint
}): Promise<Hex> => {
    // Build the account initialization data
    const initialisationData = getKernelInitData<entryPoint>({
        validatorAddress,
        enableData,
        entryPoint: entryPointAddress
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
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>({
    client,
    entryPoint: entryPointAddress,
    initCodeProvider
}: {
    client: Client<TTransport, TChain, undefined>
    initCodeProvider: () => Promise<Hex>
    entryPoint: entryPoint
}): Promise<Address> => {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)

    // Find the init code for this account
    const initCode = await initCodeProvider()
    if (entryPointVersion === "v0.6") {
        return getSenderAddress<ENTRYPOINT_ADDRESS_V06_TYPE>(client, {
            initCode,
            entryPoint: entryPointAddress as ENTRYPOINT_ADDRESS_V06_TYPE
        })
    }

    // Get the sender address based on the init code
    return getSenderAddress<ENTRYPOINT_ADDRESS_V07_TYPE>(client, {
        factory: parseFactoryAddressAndCallDataFromAccountInitCode(initCode)[0],
        factoryData:
            parseFactoryAddressAndCallDataFromAccountInitCode(initCode)[1],
        entryPoint: entryPointAddress as ENTRYPOINT_ADDRESS_V07_TYPE
    })
}

const parseFactoryAddressAndCallDataFromAccountInitCode = (
    initCode: Hex
): [Address, Hex] => {
    const factoryAddress = `0x${initCode.substring(2, 42)}` as Address
    const factoryCalldata = `0x${initCode.substring(42)}` as Hex
    return [factoryAddress, factoryCalldata]
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
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        plugins,
        entryPoint: entryPointAddress,
        index = 0n,
        factoryAddress = KERNEL_ADDRESSES.FACTORY_ADDRESS,
        accountLogicAddress = KERNEL_ADDRESSES.ACCOUNT_LOGIC_V0_6,
        deployedAccountAddress
    }: CreateKernelAccountParameters<entryPoint>
): Promise<KernelSmartAccount<entryPoint, TTransport, TChain>> {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)
    accountLogicAddress =
        entryPointVersion === "v0.6"
            ? KERNEL_ADDRESSES.ACCOUNT_LOGIC_V0_6
            : KERNEL_ADDRESSES.ACCOUNT_LOGIC_V0_7

    const kernelPluginManager = isKernelPluginManager<entryPoint>(plugins)
        ? plugins
        : await toKernelPluginManager<entryPoint>(client, {
              sudo: plugins.sudo,
              regular: plugins.regular,
              executorData: plugins.executorData,
              pluginEnableSignature: plugins.pluginEnableSignature,
              entryPoint: entryPointAddress
          })
    // Helper to generate the init code for the smart account
    const generateInitCode = async () => {
        const validatorInitData =
            await kernelPluginManager.getValidatorInitData()
        return getAccountInitCode<entryPoint>({
            index,
            factoryAddress,
            accountLogicAddress,
            validatorAddress: validatorInitData.validatorAddress,
            enableData: validatorInitData.enableData,
            entryPoint: entryPointAddress
        })
    }

    // Fetch account address and chain id
    const accountAddress =
        deployedAccountAddress ??
        (await getAccountAddress<entryPoint, TTransport, TChain>({
            client,
            entryPoint: entryPointAddress,
            initCodeProvider: generateInitCode
        }))

    if (!accountAddress) throw new Error("Account address not found")

    let smartAccountDeployed = await isSmartAccountDeployed(
        client,
        accountAddress
    )

    const signHashedMessage = async (messageHash: Hex): Promise<Hex> => {
        const kernelImplAddr = await getKernelImplementationAddress(
            client,
            accountAddress
        )
        const kernelVersion = getKernelVersion(
            entryPointAddress,
            kernelImplAddr
        )
        if (
            !hasKernelFeature(
                KERNEL_FEATURES.ERC1271_SIG_WRAPPER,
                kernelVersion
            )
        ) {
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

        let finalMessageHash = messageHash
        if (
            hasKernelFeature(
                KERNEL_FEATURES.ERC1271_SIG_WRAPPER_WITH_WRAPPED_HASH,
                kernelVersion
            )
        ) {
            finalMessageHash = keccak256(
                encodeAbiParameters(
                    [{ type: "bytes32" }, { type: "bytes32" }],
                    [
                        keccak256(stringToHex("Kernel(bytes32 hash)")),
                        messageHash
                    ]
                )
            )
        }

        const digest = keccak256(
            concatHex(["0x1901", domainSeparator, finalMessageHash])
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
                isSmartAccountDeployed(client, accountAddress),
                signHashedMessage(messageHash)
            ])
            const kernelImplAddr = await getKernelImplementationAddress(
                client,
                accountAddress
            )
            const kernelVersion = getKernelVersion(
                entryPointAddress,
                kernelImplAddr
            )
            if (
                !hasKernelFeature(
                    KERNEL_FEATURES.ERC1271_WITH_VALIDATOR,
                    kernelVersion
                )
            ) {
                return create6492Signature(isDeployed, signature)
            }

            const validatorInitData =
                await kernelPluginManager.getValidatorInitData()
            return create6492Signature(
                isDeployed,
                concatHex([
                    pad(
                        concatHex(["0x1", validatorInitData.validatorAddress]),
                        {
                            size: 21,
                            dir: "left"
                        }
                    ),
                    signature
                ])
            )
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount()
        },
        async signTypedData(typedData) {
            const kernelImplAddr = await getKernelImplementationAddress(
                client,
                accountAddress
            )
            const kernelVersion = getKernelVersion(
                entryPointAddress,
                kernelImplAddr
            )
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
                isSmartAccountDeployed(client, accountAddress),
                signHashedMessage(typedHash)
            ])
            if (
                !hasKernelFeature(
                    KERNEL_FEATURES.ERC1271_WITH_VALIDATOR,
                    kernelVersion
                )
            ) {
                return create6492Signature(isDeployed, signature)
            }
            const validatorInitData =
                await kernelPluginManager.getValidatorInitData()
            return create6492Signature(
                isDeployed,
                concatHex([
                    pad(
                        // [TODO] - Make the Validator type dynamic to support permission validators
                        concatHex(["0x1", validatorInitData.validatorAddress]),
                        {
                            size: 21,
                            dir: "left"
                        }
                    ),
                    signature
                ])
            )
        }
    })

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
        entryPoint: entryPointAddress,
        source: "kernelSmartAccount",
        kernelPluginManager,
        generateInitCode,

        async getFactory() {
            if (smartAccountDeployed) return undefined

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                accountAddress
            )

            if (smartAccountDeployed) return undefined

            return factoryAddress
        },

        async getFactoryData() {
            if (smartAccountDeployed) return undefined

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                accountAddress
            )

            if (smartAccountDeployed) return undefined

            return parseFactoryAddressAndCallDataFromAccountInitCode(
                await generateInitCode()
            )[1]
        },

        // Get the nonce of the smart account
        async getNonce() {
            const key = await kernelPluginManager.getNonceKey(accountAddress)
            return getAccountNonce(client, {
                sender: accountAddress,
                entryPoint: entryPointAddress,
                key
            })
        },

        // Sign a user operation
        async signUserOperation(userOperation) {
            return kernelPluginManager.signUserOperation(userOperation)
        },

        // Encode the init code
        async getInitCode() {
            if (smartAccountDeployed) return "0x"

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                accountAddress
            )

            if (smartAccountDeployed) return "0x"
            return generateInitCode()
        },

        // [TODO] - CLeanup the encoding functions

        // Encode the deploy call data
        async encodeDeployCallData(_tx) {
            if (entryPointVersion === "v0.6") {
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
            }

            return encodeFunctionData({
                abi: KernelV3ExecuteAbi,
                functionName: "execute",
                args: [
                    getExecMode(CALL_TYPE.DELEGATE_CALL, EXEC_TYPE.DEFAULT),
                    encodeAbiParameters(
                        parseAbiParameters("address to, bytes data"),
                        [
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
                    )
                ]
            })
        },

        // Encode a call
        async encodeCallData(_tx) {
            const tx = _tx as KernelEncodeCallDataArgs
            if (Array.isArray(tx)) {
                // Encode a batched call
                if (entryPointVersion === "v0.6") {
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
                return encodeFunctionData({
                    abi: KernelV3ExecuteAbi,
                    functionName: "execute",
                    args: [
                        getExecMode(CALL_TYPE.BATCH, EXEC_TYPE.DEFAULT),
                        encodeAbiParameters(
                            [
                                {
                                    name: "executionBatch",
                                    type: "tuple[]",
                                    components: [
                                        {
                                            name: "target",
                                            type: "address"
                                        },
                                        {
                                            name: "value",
                                            type: "uint256"
                                        },
                                        {
                                            name: "callData",
                                            type: "bytes"
                                        }
                                    ]
                                }
                            ],
                            [
                                tx.map((txn) => {
                                    if (txn.callType === "delegatecall") {
                                        throw new Error(
                                            "Cannot batch delegatecall"
                                        )
                                    }
                                    return {
                                        target: txn.to,
                                        value: txn.value,
                                        callData: txn.data
                                    }
                                })
                            ]
                        )
                    ]
                })
            }

            // Default to `call`
            if (!tx.callType || tx.callType === "call") {
                if (tx.to.toLowerCase() === accountAddress.toLowerCase()) {
                    return tx.data
                }
                if (entryPointVersion === "v0.6") {
                    return encodeFunctionData({
                        abi: KernelExecuteAbi,
                        functionName: "execute",
                        args: [tx.to, tx.value, tx.data, 0]
                    })
                }
                return encodeFunctionData({
                    abi: KernelV3ExecuteAbi,
                    functionName: "execute",
                    args: [
                        getExecMode(CALL_TYPE.SINGLE, EXEC_TYPE.DEFAULT),
                        encodeAbiParameters(
                            parseAbiParameters(
                                "address target, uint256 value, bytes calldata callData"
                            ),
                            [tx.to, tx.value, tx.data]
                        )
                    ]
                })
            }

            if (tx.callType === "delegatecall") {
                if (entryPointVersion === "v0.6") {
                    return encodeFunctionData({
                        abi: KernelExecuteAbi,
                        functionName: "executeDelegateCall",
                        args: [tx.to, tx.data]
                    })
                }
                return encodeFunctionData({
                    abi: KernelV3ExecuteAbi,
                    functionName: "execute",
                    args: [
                        getExecMode(CALL_TYPE.DELEGATE_CALL, EXEC_TYPE.DEFAULT),
                        encodeAbiParameters(
                            parseAbiParameters(
                                "address target, bytes calldata callData"
                            ),
                            [tx.to, tx.data]
                        )
                    ]
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
