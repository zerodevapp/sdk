import {
    http,
    type Address,
    type Assign,
    type Client,
    type EncodeDeployDataParameters,
    type Hex,
    type SignableMessage,
    type TypedDataDefinition,
    concatHex,
    createNonceManager,
    createWalletClient,
    encodeFunctionData,
    getTypesForEIP712Domain,
    hashMessage,
    hashTypedData,
    isAddressEqual,
    toHex,
    validateTypedData,
    zeroAddress
} from "viem"
import {
    type EntryPointVersion,
    type SmartAccount,
    type SmartAccountImplementation,
    type UserOperation,
    entryPoint06Abi,
    entryPoint07Abi,
    entryPoint07Address,
    toSmartAccount
} from "viem/account-abstraction"
import {
    type SignAuthorizationReturnType,
    privateKeyToAccount
} from "viem/accounts"
import { getChainId, getCode, sendTransaction } from "viem/actions"
import { getAction } from "viem/utils"
import {
    getAccountNonce,
    getSenderAddress,
    isPluginInstalled
} from "../../actions/public/index.js"
import {
    KernelVersionToAddressesMap,
    MAGIC_VALUE_SIG_REPLAYABLE
} from "../../constants.js"
import type {
    CallType,
    EntryPointType,
    GetEntryPointAbi,
    GetKernelVersion,
    KernelPluginManager,
    KernelPluginManagerParams,
    PluginMigrationData
} from "../../types/kernel.js"
import type { Signer } from "../../types/utils.js"
import { KERNEL_FEATURES, hasKernelFeature } from "../../utils.js"
import { validateKernelVersionWithEntryPoint } from "../../utils.js"
import { toSigner } from "../../utils/toSigner.js"
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
import { getPluginInstallCallData } from "./utils/plugins/ep0_7/getPluginInstallCallData.js"
import type { CallArgs } from "./utils/types.js"

type SignMessageParameters = {
    message: SignableMessage
    useReplayableSignature?: boolean
}

export type KernelSmartAccountImplementation<
    entryPointVersion extends EntryPointVersion = "0.7"
> = Assign<
    SmartAccountImplementation<
        GetEntryPointAbi<entryPointVersion>,
        entryPointVersion
    >,
    {
        sign: NonNullable<SmartAccountImplementation["sign"]>
        encodeCalls: (
            calls: Parameters<SmartAccountImplementation["encodeCalls"]>[0],
            callType?: CallType | undefined
        ) => Promise<Hex>
        kernelVersion: GetKernelVersion<entryPointVersion>
        kernelPluginManager: KernelPluginManager<entryPointVersion>
        factoryAddress: Address
        generateInitCode: () => Promise<Hex>
        encodeModuleInstallCallData: () => Promise<Hex>
        encodeDeployCallData: ({
            abi,
            args,
            bytecode
        }: EncodeDeployDataParameters) => Promise<Hex>
        signMessage: (parameters: SignMessageParameters) => Promise<Hex>
        eip7702Auth?: SignAuthorizationReturnType
    }
>

export type CreateKernelAccountReturnType<
    entryPointVersion extends EntryPointVersion = "0.7"
> = SmartAccount<KernelSmartAccountImplementation<entryPointVersion>>

export type CreateKernelAccountParameters<
    entryPointVersion extends EntryPointVersion,
    KernelVerion extends GetKernelVersion<entryPointVersion>
> = {
    plugins:
        | Omit<
              KernelPluginManagerParams<entryPointVersion>,
              "entryPoint" | "kernelVersion"
          >
        | KernelPluginManager<entryPointVersion>
    entryPoint: EntryPointType<entryPointVersion>
    index?: bigint
    factoryAddress?: Address
    accountImplementationAddress?: Address
    metaFactoryAddress?: Address
    address?: Address
    kernelVersion: GetKernelVersion<entryPointVersion>
    initConfig?: KernelVerion extends "0.3.1" ? Hex[] : never
    useMetaFactory?: boolean
    eip7702Auth?: SignAuthorizationReturnType
    eip7702SponsorAccount?: Signer
    pluginMigrations?: PluginMigrationData[]
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

const getKernelInitData = async <entryPointVersion extends EntryPointVersion>({
    entryPointVersion: _entryPointVersion,
    kernelPluginManager,
    initHook,
    kernelVersion,
    initConfig
}: {
    entryPointVersion: entryPointVersion
    kernelPluginManager: KernelPluginManager<entryPointVersion>
    initHook: boolean
    kernelVersion: GetKernelVersion<entryPointVersion>
    initConfig?: GetKernelVersion<entryPointVersion> extends "0.3.1"
        ? Hex[]
        : never
}) => {
    const {
        enableData,
        identifier,
        validatorAddress,
        initConfig: initConfig_
    } = await kernelPluginManager.getValidatorInitData()

    if (_entryPointVersion === "0.6") {
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
            initConfig ?? initConfig_ ?? []
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
const getAccountInitCode = async <entryPointVersion extends EntryPointVersion>({
    index,
    factoryAddress,
    accountImplementationAddress,
    entryPointVersion: _entryPointVersion,
    kernelPluginManager,
    initHook,
    kernelVersion,
    initConfig,
    useMetaFactory
}: {
    index: bigint
    factoryAddress: Address
    accountImplementationAddress: Address
    entryPointVersion: entryPointVersion
    kernelPluginManager: KernelPluginManager<entryPointVersion>
    initHook: boolean
    kernelVersion: GetKernelVersion<entryPointVersion>
    initConfig?: GetKernelVersion<entryPointVersion> extends "0.3.1"
        ? Hex[]
        : never
    useMetaFactory: boolean
}): Promise<Hex> => {
    // Build the account initialization data
    const initialisationData = await getKernelInitData<entryPointVersion>({
        entryPointVersion: _entryPointVersion,
        kernelPluginManager,
        initHook,
        kernelVersion,
        initConfig
    })

    // Build the account init code
    if (_entryPointVersion === "0.6") {
        return encodeFunctionData({
            abi: createAccountAbi,
            functionName: "createAccount",
            args: [accountImplementationAddress, initialisationData, index]
        })
    }

    if (!useMetaFactory) {
        return encodeFunctionData({
            abi: KernelV3FactoryAbi,
            functionName: "createAccount",
            args: [initialisationData, toHex(index, { size: 32 })]
        })
    }

    return encodeFunctionData({
        abi: KernelFactoryStakerAbi,
        functionName: "deployWithFactory",
        args: [factoryAddress, initialisationData, toHex(index, { size: 32 })]
    })
}

const getDefaultAddresses = <entryPointVersion extends EntryPointVersion>(
    entryPointVersion: entryPointVersion,
    kernelVersion: GetKernelVersion<entryPointVersion>,
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
    validateKernelVersionWithEntryPoint(entryPointVersion, kernelVersion)

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
        metaFactoryAddress:
            metaFactoryAddress ?? addresses.metaFactoryAddress ?? zeroAddress
    }
}

type PluginInstallationCache = {
    pendingPlugins: PluginMigrationData[]
    allInstalled: boolean
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
 * @param address
 */
export async function createKernelAccount<
    entryPointVersion extends EntryPointVersion,
    KernelVersion extends GetKernelVersion<entryPointVersion>
>(
    client: Client,
    {
        plugins,
        entryPoint,
        index = 0n,
        factoryAddress: _factoryAddress,
        accountImplementationAddress: _accountImplementationAddress,
        metaFactoryAddress: _metaFactoryAddress,
        address,
        kernelVersion,
        initConfig,
        useMetaFactory: _useMetaFactory = true,
        eip7702Auth,
        eip7702SponsorAccount,
        pluginMigrations
    }: CreateKernelAccountParameters<entryPointVersion, KernelVersion>
): Promise<CreateKernelAccountReturnType<entryPointVersion>> {
    let useMetaFactory = _useMetaFactory
    const { accountImplementationAddress, factoryAddress, metaFactoryAddress } =
        getDefaultAddresses(entryPoint.version, kernelVersion, {
            accountImplementationAddress: _accountImplementationAddress,
            factoryAddress: _factoryAddress,
            metaFactoryAddress: _metaFactoryAddress
        })

    let chainId: number

    const getMemoizedChainId = async () => {
        if (chainId) return chainId
        chainId = client.chain
            ? client.chain.id
            : await getAction(client, getChainId, "getChainId")({})
        return chainId
    }

    const kernelPluginManager = isKernelPluginManager<entryPointVersion>(
        plugins
    )
        ? plugins
        : await toKernelPluginManager<entryPointVersion>(client, {
              sudo: plugins.sudo,
              regular: plugins.regular,
              hook: plugins.hook,
              action: plugins.action,
              pluginEnableSignature: plugins.pluginEnableSignature,
              entryPoint,
              kernelVersion,
              chainId: await getMemoizedChainId()
          })

    // initHook flag is activated only if both the hook and sudo validator are given
    // if the hook is given with regular plugins, then consider it as a hook for regular plugins
    const initHook = Boolean(
        isKernelPluginManager<entryPointVersion>(plugins)
            ? plugins.hook &&
                  plugins.getIdentifier() ===
                      plugins.sudoValidator?.getIdentifier()
            : plugins.hook && !plugins.regular
    )

    // Helper to generate the init code for the smart account
    const generateInitCode = async () => {
        if (!accountImplementationAddress || !factoryAddress)
            throw new Error("Missing account logic address or factory address")
        return getAccountInitCode<entryPointVersion>({
            index,
            factoryAddress,
            accountImplementationAddress,
            entryPointVersion: entryPoint.version,
            kernelPluginManager,
            initHook,
            kernelVersion,
            initConfig,
            useMetaFactory
        })
    }

    const getFactoryArgs = async () => {
        return {
            factory:
                entryPoint.version === "0.6" || useMetaFactory === false
                    ? factoryAddress
                    : metaFactoryAddress,
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

    // If account is zeroAddress try without meta factory
    if (isAddressEqual(accountAddress, zeroAddress) && useMetaFactory) {
        useMetaFactory = false
        accountAddress = await getSenderAddress(client, {
            factory: factoryAddress,
            factoryData: await generateInitCode(),
            entryPointAddress: entryPoint.address
        })
        if (isAddressEqual(accountAddress, zeroAddress)) {
            useMetaFactory = true
        }
    }

    const _entryPoint = {
        address: entryPoint?.address ?? entryPoint07Address,
        abi: ((entryPoint?.version ?? "0.7") === "0.6"
            ? entryPoint06Abi
            : entryPoint07Abi) as GetEntryPointAbi<entryPointVersion>,
        version: entryPoint?.version ?? "0.7"
    } as const

    if (eip7702Auth) {
        let code = await getCode(client, { address: accountAddress })
        const isEip7702Authorized =
            code?.length && code.length > 0 && code.startsWith("0xef")
        console.log("Code before:", code)
        console.log("Is Eip7702 Authorized:", isEip7702Authorized)
        if (!isEip7702Authorized) {
            const sponsorAccount = eip7702SponsorAccount
                ? await toSigner({ signer: eip7702SponsorAccount })
                : privateKeyToAccount(
                      // NOTE: Don't worry about this private key, it's just for testing
                      "0x688b84097239bc2bca41079d02fae599964a5844bc9e64f524206ad53a927bb9"
                  )
            const sponsorWalletClient = createWalletClient({
                account: sponsorAccount,
                chain: client.chain,
                transport: http()
            })
            console.log("Authorizing eip7702 account...")
            const txHash = await sendTransaction(sponsorWalletClient, {
                to: accountAddress,
                data: await getKernelInitData({
                    entryPointVersion: entryPoint.version,
                    kernelPluginManager,
                    initHook,
                    kernelVersion,
                    initConfig
                }),
                authorizationList: [eip7702Auth],
                chain: client.chain
            })
            console.log(
                `Authorized eip7702 account: ${client.chain?.blockExplorers?.default.url}/tx/${txHash}`
            )
            code = await getCode(client, { address: accountAddress })
            while (code?.length === undefined || code.length === 0) {
                code = await getCode(client, { address: accountAddress })
            }
            console.log("Code after:", code)
        }
    }

    // Cache for plugin installation status
    const pluginCache: PluginInstallationCache = {
        pendingPlugins: pluginMigrations || [],
        allInstalled: false
    }

    const checkPluginInstallationStatus = async () => {
        // Skip if no plugins or all are installed
        if (!pluginCache.pendingPlugins.length || pluginCache.allInstalled) {
            pluginCache.allInstalled = true
            return
        }

        // Check all pending plugins in parallel
        const installationResults = await Promise.all(
            pluginCache.pendingPlugins.map((plugin) =>
                isPluginInstalled(client, {
                    address: accountAddress,
                    plugin
                })
            )
        )

        // Filter out installed plugins
        pluginCache.pendingPlugins = pluginCache.pendingPlugins.filter(
            (_, index) => !installationResults[index]
        )
        pluginCache.allInstalled = pluginCache.pendingPlugins.length === 0
    }

    await checkPluginInstallationStatus()

    return toSmartAccount<KernelSmartAccountImplementation<entryPointVersion>>({
        eip7702Auth,
        kernelVersion,
        kernelPluginManager,
        factoryAddress: (await getFactoryArgs()).factory,
        generateInitCode,
        encodeModuleInstallCallData: async () => {
            return await kernelPluginManager.encodeModuleInstallCallData(
                accountAddress
            )
        },
        nonceKeyManager: createNonceManager({
            source: { get: () => 0, set: () => {} }
        }),
        client,
        entryPoint: _entryPoint,
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
        // Encode the deploy call data
        async encodeDeployCallData(_tx) {
            if (entryPoint.version === "0.6") {
                return encodeDeployCallDataV06(_tx)
            }
            return encodeDeployCallDataV07(_tx)
        },
        async encodeCalls(calls, callType) {
            // Check plugin status only if we have pending plugins
            await checkPluginInstallationStatus()

            // Add plugin installation calls if needed
            if (
                pluginCache.pendingPlugins.length > 0 &&
                entryPoint.version === "0.7" &&
                kernelPluginManager.activeValidatorMode === "sudo"
            ) {
                // convert map into for loop
                const pluginInstallCalls: CallArgs[] = []
                for (const plugin of pluginCache.pendingPlugins) {
                    pluginInstallCalls.push(
                        getPluginInstallCallData(accountAddress, plugin)
                    )
                }
                return encodeCallDataEpV07(
                    [...calls, ...pluginInstallCalls],
                    callType,
                    plugins.hook ? true : undefined
                )
            }

            if (
                calls.length === 1 &&
                (!callType || callType === "call") &&
                calls[0].to.toLowerCase() === accountAddress.toLowerCase()
            ) {
                return calls[0].data ?? "0x"
            }
            if (entryPoint.version === "0.6") {
                return encodeCallDataEpV06(calls, callType)
            }

            if (plugins.hook) {
                return encodeCallDataEpV07(calls, callType, true)
            }
            return encodeCallDataEpV07(calls, callType)
        },
        async sign({ hash }) {
            return this.signMessage({ message: hash })
        },
        async signMessage({ message, useReplayableSignature }) {
            const messageHash = hashMessage(message)
            const {
                name,
                chainId: metadataChainId,
                version
            } = await accountMetadata(
                client,
                accountAddress,
                kernelVersion,
                chainId
            )
            const wrappedMessageHash = await eip712WrapHash(
                messageHash,
                {
                    name,
                    chainId: Number(metadataChainId),
                    version,
                    verifyingContract: accountAddress
                },
                useReplayableSignature
            )
            let signature = await kernelPluginManager.signMessage({
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

            if (
                useReplayableSignature &&
                hasKernelFeature(KERNEL_FEATURES.ERC1271_REPLAYABLE, version)
            ) {
                signature = concatHex([MAGIC_VALUE_SIG_REPLAYABLE, signature])
            }

            return concatHex([kernelPluginManager.getIdentifier(), signature])
        },
        async signTypedData(typedData) {
            const {
                message,
                primaryType,
                types: _types,
                domain
            } = typedData as TypedDataDefinition
            const types = {
                EIP712Domain: getTypesForEIP712Domain({
                    domain: domain
                }),
                ..._types
            }

            // Need to do a runtime validation check on addresses, byte ranges, integer ranges, etc
            // as we can't statically check this with TypeScript.
            validateTypedData({
                domain: domain,
                message: message,
                primaryType: primaryType,
                types: types
            })

            const typedHash = hashTypedData(typedData)

            const {
                name,
                chainId: metadataChainId,
                version
            } = await accountMetadata(
                client,
                accountAddress,
                kernelVersion,
                chainId
            )
            const wrappedMessageHash = await eip712WrapHash(typedHash, {
                name,
                chainId: Number(metadataChainId),
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
            return concatHex([kernelPluginManager.getIdentifier(), signature])
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
        async getStubSignature(userOperation) {
            if (!userOperation) {
                throw new Error("No user operation provided")
            }
            return kernelPluginManager.getStubSignature(
                userOperation as UserOperation
            )
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
        }
    }) as Promise<CreateKernelAccountReturnType<entryPointVersion>>
}
