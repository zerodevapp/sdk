import {
    type Address,
    type Chain,
    type Client,
    type EncodeDeployDataParameters,
    type Hex,
    type PublicActions,
    type PublicRpcSchema,
    type Transport,
    type TypedDataDefinition,
    concatHex,
    createNonceManager,
    encodeDeployData,
    encodeFunctionData,
    getTypesForEIP712Domain,
    hashTypedData,
    parseAbi,
    validateTypedData
} from "viem"
import {
    type UserOperation,
    entryPoint06Abi,
    entryPoint06Address,
    toSmartAccount
} from "viem/account-abstraction"
import { toAccount } from "viem/accounts"
import { getChainId } from "viem/actions"
import { getAction } from "viem/utils"
import {
    getAccountNonce,
    getSenderAddress
} from "../../../actions/public/index.js"
import type {
    GetKernelVersion,
    KernelPluginManager,
    KernelPluginManagerParams
} from "../../../types/kernel.js"
import {
    MULTISEND_ADDRESS,
    encodeMultiSend,
    multiSendAbi
} from "../../utils/multisend.js"
import {
    isKernelPluginManager,
    toKernelPluginManager
} from "../../utils/toKernelPluginManager.js"
import type {
    CreateKernelAccountReturnType,
    KernelSmartAccountImplementation
} from "../createKernelAccount.js"
import { KernelAccountV2Abi } from "./abi/KernelAccountV2Abi.js"
import { KernelFactoryV2Abi } from "./abi/KernelFactoryV2Abi.js"

// Safe's library for create and create2: https://github.com/safe-global/safe-contracts/blob/0acdd35a203299585438f53885df630f9d486a86/contracts/libraries/CreateCall.sol
// Address was found here: https://github.com/safe-global/safe-deployments/blob/926ec6bbe2ebcac3aa2c2c6c0aff74aa590cbc6a/src/assets/v1.4.1/create_call.json
const createCallAddress = "0x9b35Af71d77eaf8d7e40252370304687390A1A52"

const createCallAbi = parseAbi([
    "function performCreate(uint256 value, bytes memory deploymentData) public returns (address newContract)",
    "function performCreate2(uint256 value, bytes memory deploymentData, bytes32 salt) public returns (address newContract)"
])

/**
 * Default addresses for kernel smart account
 */
export const KERNEL_ADDRESSES: {
    FACTORY_ADDRESS: Address
    ENTRYPOINT_V0_6: Address
} = {
    FACTORY_ADDRESS: "0xaee9762ce625e0a8f7b184670fb57c37bfe1d0f1",
    ENTRYPOINT_V0_6: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
}

/**
 * Get the account initialization code for a kernel smart account
 * @param index
 * @param factoryAddress
 * @param ecdsaValidatorAddress
 */
const getAccountInitCode = async ({
    index,
    factoryAddress,
    validatorAddress,
    enableData
}: {
    index: bigint
    factoryAddress: Address
    validatorAddress: Address
    enableData: Hex
}): Promise<Hex> => {
    // Build the account init code
    return concatHex([
        factoryAddress,
        encodeFunctionData({
            abi: KernelFactoryV2Abi,
            functionName: "createAccount",
            args: [validatorAddress, enableData, index]
        }) as Hex
    ])
}

/**
 * Build a kernel smart account from a private key, that use the ECDSA signer behind the scene
 * @param client
 * @param privateKey
 * @param entryPoint
 * @param index
 * @param factoryAddress
 * @param ecdsaValidatorAddress
 * @param deployedAccountAddress
 */
export async function createKernelAccountV0_2<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<
        TTransport,
        TChain,
        undefined,
        PublicRpcSchema,
        PublicActions<TTransport, TChain>
    >,
    {
        plugins,
        entryPoint,
        index = 0n,
        factoryAddress = KERNEL_ADDRESSES.FACTORY_ADDRESS,
        address
    }: {
        plugins:
            | Omit<
                  KernelPluginManagerParams<"0.6">,
                  "entryPoint" | "kernelVersion"
              >
            | KernelPluginManager<"0.6">
        entryPoint: {
            address: Address
            version: "0.6"
        }
        index?: bigint
        factoryAddress?: Address
        address?: Address
    }
): Promise<CreateKernelAccountReturnType<"0.6">> {
    const kernelPluginManager = isKernelPluginManager<"0.6">(plugins)
        ? plugins
        : await toKernelPluginManager(client, {
              sudo: plugins.sudo,
              regular: plugins.regular,
              action: plugins.action,
              pluginEnableSignature: plugins.pluginEnableSignature,
              kernelVersion: "0.0.2",
              entryPoint
          })
    // Helper to generate the init code for the smart account
    const generateInitCode = async () => {
        const validatorInitData =
            await kernelPluginManager.getValidatorInitData()
        return getAccountInitCode({
            index,
            factoryAddress,
            validatorAddress: validatorInitData.validatorAddress,
            enableData: validatorInitData.enableData
        })
    }

    const getFactoryArgs = async () => {
        return {
            factory: factoryAddress,
            factoryData: await generateInitCode()
        }
    }

    // Fetch account address
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

    // Build the EOA Signer
    const account = toAccount({
        address: accountAddress,
        async signMessage({ message }) {
            return kernelPluginManager.signMessage({
                message
            })
        },
        async signTransaction(_, __) {
            throw new Error(
                "Smart account signer doesn't need to sign transactions"
            )
        },
        async signTypedData(typedData) {
            const _typedData = typedData as TypedDataDefinition
            const types = {
                EIP712Domain: getTypesForEIP712Domain({
                    domain: _typedData.domain
                }),
                ..._typedData.types
            }

            // Need to do a runtime validation check on addresses, byte ranges, integer ranges, etc
            // as we can't statically check this with TypeScript.
            validateTypedData({
                domain: _typedData.domain,
                message: _typedData.message,
                primaryType: _typedData.primaryType,
                types: types
            })

            const typedHash = hashTypedData(typedData)
            return kernelPluginManager.signMessage({
                message: {
                    raw: typedHash
                }
            })
        }
    })

    const _entryPoint = {
        address: entryPoint?.address ?? entryPoint06Address,
        abi: entryPoint06Abi,
        version: entryPoint?.version ?? "0.6"
    }
    let chainId: number

    const getMemoizedChainId = async () => {
        if (chainId) return chainId
        chainId = client.chain
            ? client.chain.id
            : await getAction(client, getChainId, "getChainId")({})
        return chainId
    }

    return toSmartAccount<KernelSmartAccountImplementation<"0.6">>({
        kernelVersion: "0.0.2" as GetKernelVersion<"0.6">,
        client: client,
        entryPoint: _entryPoint,
        kernelPluginManager,
        generateInitCode,
        encodeModuleInstallCallData: async () => {
            return await kernelPluginManager.encodeModuleInstallCallData(
                accountAddress
            )
        },
        nonceKeyManager: createNonceManager({
            source: { get: () => 0, set: () => {} }
        }),
        async sign({ hash }) {
            return account.signMessage({ message: hash })
        },
        async signMessage(message) {
            return account.signMessage(message)
        },
        async signTypedData(typedData) {
            return account.signTypedData(typedData)
        },
        getFactoryArgs,
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
        // Get the nonce of the smart account
        async getNonce(_args) {
            const key = await kernelPluginManager.getNonceKey(
                accountAddress,
                _args?.key
            )
            return getAccountNonce(client, {
                address: accountAddress,
                entryPointAddress: entryPoint.address,
                key
            })
        },

        // Sign a user operation
        async signUserOperation(parameters) {
            const { chainId = await getMemoizedChainId(), ...userOperation } =
                parameters
            return kernelPluginManager.signUserOperation({
                ...userOperation,
                sender: userOperation.sender ?? (await this.getAddress()),
                chainId
            })
        },
        // Encode the deploy call data
        async encodeDeployCallData(_tx) {
            return encodeFunctionData({
                abi: KernelAccountV2Abi,
                functionName: "execute",
                args: [
                    createCallAddress,
                    0n,
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
                    }),
                    1 // Delegate call
                ]
            })
        },

        // Encode a call
        async encodeCalls(calls, callType): Promise<Hex> {
            if (calls.length > 1) {
                const multiSendCallData = encodeFunctionData({
                    abi: multiSendAbi,
                    functionName: "multiSend",
                    args: [encodeMultiSend(calls)]
                })
                return encodeFunctionData({
                    abi: KernelAccountV2Abi,
                    functionName: "execute",
                    args: [MULTISEND_ADDRESS, 0n, multiSendCallData, 1]
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
                    abi: KernelAccountV2Abi,
                    functionName: "execute",
                    args: [call.to, call.value || 0n, call.data || "0x", 0]
                })
            }

            if (callType === "delegatecall") {
                return encodeFunctionData({
                    abi: KernelAccountV2Abi,
                    functionName: "execute",
                    args: [call.to, 0n, call.data || "0x", 1]
                })
            }

            throw new Error("Invalid call type")
        },

        // Get simple dummy signature
        async getStubSignature(userOperation) {
            if (!userOperation) {
                throw new Error("No user operation provided")
            }
            return kernelPluginManager.getStubSignature(
                userOperation as UserOperation
            )
        }
    })
}
