import { getAccountNonce, getSenderAddress } from "permissionless"
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
    encodeDeployData,
    encodeFunctionData,
    getTypesForEIP712Domain,
    hashMessage,
    hashTypedData,
    parseAbi,
    validateTypedData
} from "viem"
import { toAccount } from "viem/accounts"
import { getBytecode } from "viem/actions"
import type {
    KernelEncodeCallDataArgs,
    KernelPluginManager,
    KernelPluginManagerParams
} from "../../../types/kernel.js"
import { wrapSignatureWith6492 } from "../../utils/6492.js"
import { parseFactoryAddressAndCallDataFromAccountInitCode } from "../../utils/index.js"
import {
    MULTISEND_ADDRESS,
    encodeMultiSend,
    multiSendAbi
} from "../../utils/multisend.js"
import {
    isKernelPluginManager,
    toKernelPluginManager
} from "../../utils/toKernelPluginManager.js"
import { KernelAccountV2Abi } from "./abi/KernelAccountV2Abi.js"
import { KernelFactoryV2Abi } from "./abi/KernelFactoryV2Abi.js"

export type KernelSmartAccount<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = SmartAccount<"kernelSmartAccount", transport, chain> & {
    kernelPluginManager: KernelPluginManager
    generateInitCode: () => Promise<Hex>
    encodeCallData: (args: KernelEncodeCallDataArgs) => Promise<Hex>
}

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
 * @param ecdsaValidatorAddress
 * @param deployedAccountAddress
 */
export async function createKernelV2Account<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        plugins,
        entryPoint = KERNEL_ADDRESSES.ENTRYPOINT_V0_6,
        index = 0n,
        factoryAddress = KERNEL_ADDRESSES.FACTORY_ADDRESS,
        deployedAccountAddress
    }: {
        plugins: KernelPluginManagerParams | KernelPluginManager
        entryPoint?: Address
        index?: bigint
        factoryAddress?: Address
        deployedAccountAddress?: Address
    }
): Promise<KernelSmartAccount<TTransport, TChain>> {
    const kernelPluginManager = isKernelPluginManager(plugins)
        ? plugins
        : await toKernelPluginManager(client, {
              sudo: plugins.sudo,
              regular: plugins.regular,
              executorData: plugins.executorData,
              pluginEnableSignature: plugins.pluginEnableSignature,
              kernelVersion: "0.0.2" ?? plugins.kernelVersion
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

    // Fetch account address and chain id
    const accountAddress =
        deployedAccountAddress ??
        (await getAccountAddress<TTransport, TChain>({
            client,
            entryPoint,
            initCodeProvider: generateInitCode
        }))

    if (!accountAddress) throw new Error("Account address not found")

    // Build the EOA Signer
    const account = toAccount({
        address: accountAddress,
        async signMessage({ message }) {
            const messageHash = hashMessage(message)
            const [isDeployed, signature] = await Promise.all([
                isAccountDeployed(),
                kernelPluginManager.signMessage({
                    message: {
                        raw: messageHash
                    }
                })
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
                kernelPluginManager.signMessage({
                    message: {
                        raw: typedHash
                    }
                })
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
        async encodeCallData(_tx) {
            const tx = _tx as KernelEncodeCallDataArgs
            if (Array.isArray(tx)) {
                const multiSendCallData = encodeFunctionData({
                    abi: multiSendAbi,
                    functionName: "multiSend",
                    args: [encodeMultiSend(tx)]
                })
                return encodeFunctionData({
                    abi: KernelAccountV2Abi,
                    functionName: "execute",
                    args: [MULTISEND_ADDRESS, 0n, multiSendCallData, 1]
                })
            }

            // Default to `call`
            if (!tx.callType || tx.callType === "call") {
                if (tx.to.toLowerCase() === accountAddress.toLowerCase()) {
                    return tx.data
                }
                return encodeFunctionData({
                    abi: KernelAccountV2Abi,
                    functionName: "execute",
                    args: [tx.to, tx.value, tx.data, 0]
                })
            }

            if (tx.callType === "delegatecall") {
                return encodeFunctionData({
                    abi: KernelAccountV2Abi,
                    functionName: "execute",
                    args: [tx.to, 0n, tx.data, 1]
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
