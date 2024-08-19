import {
    getAccountNonce,
    getEntryPointVersion,
    getSenderAddress,
    isSmartAccountDeployed
} from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccount,
    toSmartAccount
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
    type Hex,
    type Transport,
    type TypedDataDefinition,
    concatHex,
    encodeFunctionData,
    getTypesForEIP712Domain,
    hashMessage,
    hashTypedData,
    toHex,
    validateTypedData,
    zeroAddress
} from "viem"
import { KernelVersionToAddressesMap } from "../../constants.js"
import type {
    GetKernelVersion,
    KernelEncodeCallDataArgs,
    KernelPluginManager,
    KernelPluginManagerParams
} from "../../types/kernel.js"
import { KERNEL_FEATURES, hasKernelFeature } from "../../utils.js"
import { validateKernelVersionWithEntryPoint } from "../../utils.js"
import { parseFactoryAddressAndCallDataFromAccountInitCode } from "../utils/index.js"
import {
    isKernelPluginManager,
    toKernelPluginManager
} from "../utils/toKernelPluginManager.js"
import { KernelInitAbi } from "./abi/KernelAccountAbi.js"
import { KernelV3InitAbi } from "./abi/kernel_v_3_0_0/KernelAccountAbi.js"
import { KernelV3FactoryAbi } from "./abi/kernel_v_3_0_0/KernelFactoryAbi.js"
import { KernelFactoryStakerAbi } from "./abi/kernel_v_3_0_0/KernelFactoryStakerAbi.js"
import { KernelV3_1AccountAbi } from "./abi/kernel_v_3_1/KernelAccountAbi.js"
import { encodeCallData as encodeCallDataEpV06 } from "./utils/account/ep0_6/encodeCallData.js"
import { encodeDeployCallData as encodeDeployCallDataV06 } from "./utils/account/ep0_6/encodeDeployCallData.js"
import { encodeCallData as encodeCallDataEpV07 } from "./utils/account/ep0_7/encodeCallData.js"
import { encodeDeployCallData as encodeDeployCallDataV07 } from "./utils/account/ep0_7/encodeDeployCallData.js"
import { accountMetadata } from "./utils/common/accountMetadata.js"
import { eip712WrapHash } from "./utils/common/eip712WrapHash.js"

export type KernelSmartAccount<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = SmartAccount<entryPoint, "kernelSmartAccount", transport, chain> & {
    kernelVersion: GetKernelVersion<entryPoint>
    kernelPluginManager: KernelPluginManager<entryPoint>
    getNonce: (customNonceKey?: bigint) => Promise<bigint>
    generateInitCode: () => Promise<Hex>
    encodeCallData: (args: KernelEncodeCallDataArgs) => Promise<Hex>
    encodeModuleInstallCallData: () => Promise<Hex>
}

export type CreateKernelAccountParameters<
    entryPoint extends EntryPoint,
    KernelVerion extends GetKernelVersion<entryPoint>
> = {
    plugins:
        | Omit<
              KernelPluginManagerParams<entryPoint>,
              "entryPoint" | "kernelVersion"
          >
        | KernelPluginManager<entryPoint>
    entryPoint: entryPoint
    index?: bigint
    factoryAddress?: Address
    accountImplementationAddress?: Address
    metaFactoryAddress?: Address
    deployedAccountAddress?: Address
    kernelVersion: GetKernelVersion<entryPoint>
    initConfig?: KernelVerion extends "0.3.1" ? Hex[] : never
    useMetaFactory?: boolean
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

/**
 * Default addresses for kernel smart account
 */
export const KERNEL_ADDRESSES: {
    ACCOUNT_LOGIC_V0_6: Address
    ACCOUNT_LOGIC_V0_7: Address
    FACTORY_ADDRESS_V0_6: Address
    FACTORY_ADDRESS_V0_7: Address
    FACTORY_STAKER: Address
} = {
    ACCOUNT_LOGIC_V0_6: "0xd3082872F8B06073A021b4602e022d5A070d7cfC",
    ACCOUNT_LOGIC_V0_7: "0x94F097E1ebEB4ecA3AAE54cabb08905B239A7D27",
    FACTORY_ADDRESS_V0_6: "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3",
    FACTORY_ADDRESS_V0_7: "0x6723b44Abeec4E71eBE3232BD5B455805baDD22f",
    FACTORY_STAKER: "0xd703aaE79538628d27099B8c4f621bE4CCd142d5"
}

const getKernelInitData = async <entryPoint extends EntryPoint>({
    entryPoint: entryPointAddress,
    kernelPluginManager,
    initHook,
    kernelVersion,
    initConfig
}: {
    entryPoint: entryPoint
    kernelPluginManager: KernelPluginManager<entryPoint>
    initHook: boolean
    kernelVersion: GetKernelVersion<entryPoint>
    initConfig?: GetKernelVersion<entryPoint> extends "0.3.1" ? Hex[] : never
}) => {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)
    const { enableData, identifier, validatorAddress } =
        await kernelPluginManager.getValidatorInitData()

    if (entryPointVersion === "v0.6") {
        return encodeFunctionData({
            abi: KernelInitAbi,
            functionName: "initialize",
            args: [validatorAddress, enableData]
        })
    }

    if (kernelVersion === "0.3.0") {
        return encodeFunctionData({
            abi: KernelV3InitAbi,
            functionName: "initialize",
            args: [
                identifier,
                initHook && kernelPluginManager.hook
                    ? kernelPluginManager.hook?.getIdentifier()
                    : zeroAddress,
                enableData,
                initHook && kernelPluginManager.hook
                    ? await kernelPluginManager.hook?.getEnableData()
                    : "0x"
            ]
        })
    }
    return encodeFunctionData({
        abi: KernelV3_1AccountAbi,
        functionName: "initialize",
        args: [
            identifier,
            initHook && kernelPluginManager.hook
                ? kernelPluginManager.hook?.getIdentifier()
                : zeroAddress,
            enableData,
            initHook && kernelPluginManager.hook
                ? await kernelPluginManager.hook?.getEnableData()
                : "0x",
            initConfig ?? []
        ]
    })
}

/**
 * Get the account initialization code for a kernel smart account
 * @param index
 * @param factoryAddress
 * @param accountImplementationAddress
 * @param ecdsaValidatorAddress
 */
const getAccountInitCode = async <entryPoint extends EntryPoint>({
    index,
    factoryAddress,
    accountImplementationAddress,
    metaFactoryAddress,
    entryPoint: entryPointAddress,
    kernelPluginManager,
    initHook,
    kernelVersion,
    initConfig,
    useMetaFactory
}: {
    index: bigint
    factoryAddress: Address
    accountImplementationAddress: Address
    metaFactoryAddress?: Address
    entryPoint: entryPoint
    kernelPluginManager: KernelPluginManager<entryPoint>
    initHook: boolean
    kernelVersion: GetKernelVersion<entryPoint>
    initConfig?: GetKernelVersion<entryPoint> extends "0.3.1" ? Hex[] : never
    useMetaFactory: boolean
}): Promise<Hex> => {
    // Build the account initialization data
    const initialisationData = await getKernelInitData<entryPoint>({
        entryPoint: entryPointAddress,
        kernelPluginManager,
        initHook,
        kernelVersion,
        initConfig
    })
    const entryPointVersion = getEntryPointVersion(entryPointAddress)

    // Build the account init code
    if (entryPointVersion === "v0.6") {
        return concatHex([
            factoryAddress,
            encodeFunctionData({
                abi: createAccountAbi,
                functionName: "createAccount",
                args: [accountImplementationAddress, initialisationData, index]
            }) as Hex
        ])
    }

    if (!useMetaFactory) {
        return concatHex([
            factoryAddress,
            encodeFunctionData({
                abi: KernelV3FactoryAbi,
                functionName: "createAccount",
                args: [initialisationData, toHex(index, { size: 32 })]
            }) as Hex
        ])
    }

    return concatHex([
        metaFactoryAddress ?? zeroAddress,
        encodeFunctionData({
            abi: KernelFactoryStakerAbi,
            functionName: "deployWithFactory",
            args: [
                factoryAddress,
                initialisationData,
                toHex(index, { size: 32 })
            ]
        })
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

const getDefaultAddresses = <entryPoint extends EntryPoint>(
    entryPointAddress: entryPoint,
    kernelVersion: GetKernelVersion<entryPoint>,
    {
        accountImplementationAddress,
        factoryAddress,
        metaFactoryAddress
    }: {
        accountImplementationAddress?: Address
        factoryAddress?: Address
        metaFactoryAddress?: Address
    }
) => {
    validateKernelVersionWithEntryPoint(entryPointAddress, kernelVersion)

    const addresses = KernelVersionToAddressesMap[kernelVersion]
    if (!addresses) {
        throw new Error(
            `No addresses found for kernel version ${kernelVersion}`
        )
    }

    return {
        accountImplementationAddress:
            accountImplementationAddress ??
            addresses.accountImplementationAddress,
        factoryAddress: factoryAddress ?? addresses.factoryAddress,
        metaFactoryAddress: metaFactoryAddress ?? addresses.metaFactoryAddress
    }
}

/**
 * Build a kernel smart account from a private key, that use the ECDSA signer behind the scene
 * @param client
 * @param privateKey
 * @param entryPoint
 * @param index
 * @param factoryAddress
 * @param accountImplementationAddress
 * @param ecdsaValidatorAddress
 * @param deployedAccountAddress
 */
export async function createKernelAccount<
    entryPoint extends EntryPoint,
    KernelVersion extends GetKernelVersion<entryPoint>,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        plugins,
        entryPoint: entryPointAddress,
        index = 0n,
        factoryAddress: _factoryAddress,
        accountImplementationAddress: _accountImplementationAddress,
        metaFactoryAddress: _metaFactoryAddress,
        deployedAccountAddress,
        kernelVersion,
        initConfig,
        useMetaFactory = true
    }: CreateKernelAccountParameters<entryPoint, KernelVersion>
): Promise<KernelSmartAccount<entryPoint, TTransport, TChain>> {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)
    const { accountImplementationAddress, factoryAddress, metaFactoryAddress } =
        getDefaultAddresses(entryPointAddress, kernelVersion, {
            accountImplementationAddress: _accountImplementationAddress,
            factoryAddress: _factoryAddress,
            metaFactoryAddress: _metaFactoryAddress
        })

    const kernelPluginManager = isKernelPluginManager<entryPoint>(plugins)
        ? plugins
        : await toKernelPluginManager<entryPoint>(client, {
              sudo: plugins.sudo,
              regular: plugins.regular,
              hook: plugins.hook,
              action: plugins.action,
              pluginEnableSignature: plugins.pluginEnableSignature,
              entryPoint: entryPointAddress,
              kernelVersion
          })

    // initHook flag is activated only if both the hook and sudo validator are given
    // if the hook is given with regular plugins, then consider it as a hook for regular plugins
    const initHook = Boolean(
        isKernelPluginManager<entryPoint>(plugins)
            ? plugins.hook &&
                  plugins.getIdentifier() ===
                      plugins.sudoValidator?.getIdentifier()
            : plugins.hook && !plugins.regular
    )

    // Helper to generate the init code for the smart account
    const generateInitCode = async () => {
        if (!accountImplementationAddress || !factoryAddress)
            throw new Error("Missing account logic address or factory address")
        return getAccountInitCode<entryPoint>({
            index,
            factoryAddress,
            accountImplementationAddress,
            metaFactoryAddress,
            entryPoint: entryPointAddress,
            kernelPluginManager,
            initHook,
            kernelVersion,
            initConfig,
            useMetaFactory
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

    return {
        kernelVersion,
        kernelPluginManager,
        generateInitCode,
        encodeModuleInstallCallData: async () => {
            return await kernelPluginManager.encodeModuleInstallCallData(
                accountAddress
            )
        },
        ...toSmartAccount({
            address: accountAddress,
            publicKey: accountAddress,
            source: "kernelSmartAccount",
            client,
            entryPoint: entryPointAddress,
            // Encode the deploy call data
            async encodeDeployCallData(_tx) {
                if (entryPointVersion === "v0.6") {
                    return encodeDeployCallDataV06(_tx)
                }
                return encodeDeployCallDataV07(_tx)
            },
            async encodeCallData(_tx) {
                const tx = _tx as KernelEncodeCallDataArgs
                if (
                    !Array.isArray(tx) &&
                    (!tx.callType || tx.callType === "call") &&
                    tx.to.toLowerCase() === accountAddress.toLowerCase()
                ) {
                    return tx.data
                }
                if (entryPointVersion === "v0.6") {
                    return encodeCallDataEpV06(tx)
                }

                if (plugins.hook) {
                    return encodeCallDataEpV07(tx, true)
                }
                return encodeCallDataEpV07(tx)
            },
            async getFactory() {
                if (smartAccountDeployed) return undefined

                smartAccountDeployed = await isSmartAccountDeployed(
                    client,
                    accountAddress
                )

                if (smartAccountDeployed) return undefined

                const entryPointVersion =
                    getEntryPointVersion(entryPointAddress)
                if (entryPointVersion === "v0.6") {
                    return factoryAddress
                }
                if (!useMetaFactory) {
                    return factoryAddress
                }
                return metaFactoryAddress
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
            async signMessage({ message }) {
                const messageHash = hashMessage(message)
                const { name, chainId, version } = await accountMetadata(
                    client,
                    accountAddress,
                    kernelVersion
                )
                const wrappedMessageHash = await eip712WrapHash(messageHash, {
                    name,
                    chainId: Number(chainId),
                    version,
                    verifyingContract: accountAddress
                })
                const signature = await kernelPluginManager.signMessage({
                    message: { raw: wrappedMessageHash }
                })

                if (
                    !hasKernelFeature(
                        KERNEL_FEATURES.ERC1271_WITH_VALIDATOR,
                        version
                    )
                ) {
                    return signature
                }

                return concatHex([
                    kernelPluginManager.getIdentifier(),
                    signature
                ])
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

                const { name, chainId, version } = await accountMetadata(
                    client,
                    accountAddress,
                    kernelVersion
                )
                const wrappedMessageHash = await eip712WrapHash(typedHash, {
                    name,
                    chainId: Number(chainId),
                    version,
                    verifyingContract: accountAddress
                })
                const signature = await kernelPluginManager.signMessage({
                    message: { raw: wrappedMessageHash }
                })
                if (
                    !hasKernelFeature(
                        KERNEL_FEATURES.ERC1271_WITH_VALIDATOR,
                        version
                    )
                ) {
                    return signature
                }
                return concatHex([
                    kernelPluginManager.getIdentifier(),
                    signature
                ])
            },
            // Get the nonce of the smart account
            async getNonce(customNonceKey?: bigint) {
                const key = await kernelPluginManager.getNonceKey(
                    accountAddress,
                    customNonceKey
                )
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

            // Get simple dummy signature
            async getDummySignature(userOperation) {
                return kernelPluginManager.getDummySignature(userOperation)
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
            }
        })
    }
}
