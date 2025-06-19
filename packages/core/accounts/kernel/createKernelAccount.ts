import { satisfies } from "semver"
import {
    http,
    type Address,
    type Assign,
    type Chain,
    type EncodeDeployDataParameters,
    type Hex,
    type LocalAccount,
    type SignableMessage,
    type TypedDataDefinition,
    concatHex,
    createNonceManager,
    createPublicClient,
    decodeAbiParameters,
    decodeFunctionData,
    encodeFunctionData,
    getTypesForEIP712Domain,
    hashMessage,
    hashTypedData,
    isAddressEqual,
    slice,
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
import type {
    PrivateKeyAccount,
    SignAuthorizationReturnType
} from "viem/accounts"
import {
    getChainId,
    getCode,
    readContract,
    signAuthorization as signAuthorizationAction
} from "viem/actions"
import { getAction, verifyAuthorization } from "viem/utils"
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
    KernelValidator,
    PluginMigrationData
} from "../../types/kernel.js"
import type {
    KERNEL_V3_VERSION_TYPE,
    KERNEL_V4_VERSION_TYPE
} from "../../types/kernel.js"
import type { Signer } from "../../types/utils.js"
import { KERNEL_FEATURES, hasKernelFeature } from "../../utils.js"
import { validateKernelVersionWithEntryPoint } from "../../utils.js"
import { toSigner } from "../../utils/toSigner.js"
import { addressToEmptyAccount } from "../addressToEmptyAccount.js"
import { signerTo7702Validator } from "../utils/signerTo7702Validator.js"
import {
    isKernelPluginManager,
    toKernelPluginManager
} from "../utils/toKernelPluginManager.js"
import { KernelInitAbi } from "./abi/KernelAccountAbi.js"
import { KernelV3InitAbi } from "./abi/kernel_v_3_0_0/KernelAccountAbi.js"
import { KernelV3FactoryAbi } from "./abi/kernel_v_3_0_0/KernelFactoryAbi.js"
import { KernelFactoryStakerAbi } from "./abi/kernel_v_3_0_0/KernelFactoryStakerAbi.js"
import { KernelV3_1AccountAbi } from "./abi/kernel_v_3_1/KernelAccountAbi.js"
import { KernelV4_0AccountAbi } from "./abi/kernel_v_4_0_0/KernelAccountAbi.js"
import { KernelV4FactoryAbi } from "./abi/kernel_v_4_0_0/KernelFactoryAbi.js"
import { encodeCallData as encodeCallDataEpV06 } from "./utils/account/ep0_6/encodeCallData.js"
import { encodeDeployCallData as encodeDeployCallDataV06 } from "./utils/account/ep0_6/encodeDeployCallData.js"
import { encodeCallData as encodeCallDataEpV07 } from "./utils/account/ep0_7/encodeCallData.js"
import { encodeDeployCallData as encodeDeployCallDataV07 } from "./utils/account/ep0_7/encodeDeployCallData.js"
import {
    type AccountMetadata,
    accountMetadata
} from "./utils/common/accountMetadata.js"
import { eip712WrapHash } from "./utils/common/eip712WrapHash.js"
import { getPluginInstallCallData } from "./utils/plugins/ep0_7/getPluginInstallCallData.js"
import type { CallArgs } from "./utils/types.js"

type SignMessageParameters = {
    message: SignableMessage
    useReplayableSignature?: boolean
}

type Eip7702AuthorizationParameters = {
    chain?: Chain
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
        accountImplementationAddress: Address
        generateInitCode: () => Promise<Hex>
        encodeModuleInstallCallData: () => Promise<Hex>
        encodeDeployCallData: ({
            abi,
            args,
            bytecode
        }: EncodeDeployDataParameters) => Promise<Hex>
        signMessage: (parameters: SignMessageParameters) => Promise<Hex>
        eip7702Authorization?:
            | ((
                  parameters?: Eip7702AuthorizationParameters
              ) => Promise<SignAuthorizationReturnType | undefined>)
            | undefined
    }
>

export type CreateKernelAccountReturnType<
    entryPointVersion extends EntryPointVersion = "0.7"
> = SmartAccount<KernelSmartAccountImplementation<entryPointVersion>>

export type CreateKernelAccountParameters<
    entryPointVersion extends EntryPointVersion,
    KernelVersion extends GetKernelVersion<entryPointVersion>
> = {
    entryPoint: EntryPointType<entryPointVersion>
    index?: bigint
    factoryAddress?: Address
    accountImplementationAddress?: Address
    metaFactoryAddress?: Address
    address?: Address
    kernelVersion: KernelVersion
    initConfig?: KernelVersion extends
        | KERNEL_V3_VERSION_TYPE
        | KERNEL_V4_VERSION_TYPE
        ? Hex[]
        : never
    useMetaFactory?: boolean
    pluginMigrations?: PluginMigrationData[]
} & (
    | {
          eip7702Auth?: SignAuthorizationReturnType | undefined
          eip7702Account: Signer
          plugins?:
              | Omit<
                    KernelPluginManagerParams<entryPointVersion>,
                    "entryPoint" | "kernelVersion"
                >
              | KernelPluginManager<entryPointVersion>
              | undefined
      }
    | {
          eip7702Auth?: SignAuthorizationReturnType | undefined
          eip7702Account?: Signer | undefined
          plugins:
              | Omit<
                    KernelPluginManagerParams<entryPointVersion>,
                    "entryPoint" | "kernelVersion"
                >
              | KernelPluginManager<entryPointVersion>
      }
)

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
    initConfig?: GetKernelVersion<entryPointVersion> extends
        | KERNEL_V3_VERSION_TYPE
        | KERNEL_V4_VERSION_TYPE
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
    client: KernelSmartAccountImplementation["client"],
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
        eip7702Account,
        pluginMigrations
    }: CreateKernelAccountParameters<entryPointVersion, KernelVersion>
): Promise<CreateKernelAccountReturnType<entryPointVersion>> {
    const isEip7702 = !!eip7702Account || !!eip7702Auth
    if (isEip7702 && !satisfies(kernelVersion, ">=0.3.3")) {
        throw new Error("EIP-7702 is recommended for kernel version >=0.3.3")
    }
    const localAccount = eip7702Account
        ? await toSigner({ signer: eip7702Account, address })
        : undefined

    let eip7702Validator: KernelValidator<"EIP7702Validator"> | undefined
    if (localAccount) {
        eip7702Validator = await signerTo7702Validator(client, {
            signer: localAccount,
            entryPoint,
            kernelVersion
        })
    }
    let useMetaFactory = _useMetaFactory
    const { accountImplementationAddress, factoryAddress, metaFactoryAddress } =
        getDefaultAddresses(entryPoint.version, kernelVersion, {
            accountImplementationAddress: _accountImplementationAddress,
            factoryAddress: _factoryAddress,
            metaFactoryAddress: _metaFactoryAddress
        })

    let chainId: number
    let cachedAccountMetadata: AccountMetadata | undefined

    const getMemoizedChainId = async () => {
        if (chainId) return chainId
        chainId = client.chain
            ? client.chain.id
            : await getAction(client, getChainId, "getChainId")({})
        return chainId
    }

    const getMemoizedAccountMetadata = async () => {
        if (cachedAccountMetadata) return cachedAccountMetadata
        cachedAccountMetadata = await accountMetadata(
            client,
            accountAddress,
            kernelVersion,
            await getMemoizedChainId()
        )
        return cachedAccountMetadata
    }

    const kernelPluginManager = isKernelPluginManager<entryPointVersion>(
        plugins
    )
        ? plugins
        : await toKernelPluginManager<entryPointVersion>(client, {
              sudo: localAccount ? eip7702Validator : plugins?.sudo,
              regular: plugins?.regular,
              hook: plugins?.hook,
              action: plugins?.action,
              pluginEnableSignature: plugins?.pluginEnableSignature,
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
            : plugins?.hook && !plugins?.regular
    )

    /**
     * Get the account initialization code for a kernel smart account
     * @param index
     * @param factoryAddress
     * @param accountImplementationAddress
     * @param ecdsaValidatorAddress
     */
    const getAccountInitCode = async <
        entryPointVersion extends EntryPointVersion
    >({
        index,
        factoryAddress,
        accountImplementationAddress,
        entryPointVersion: _entryPointVersion,
        kernelPluginManager,
        initHook,
        kernelVersion,
        initConfig,
        isEip7702,
        useMetaFactory
    }: {
        index: bigint
        factoryAddress: Address
        accountImplementationAddress: Address
        entryPointVersion: entryPointVersion
        kernelPluginManager: KernelPluginManager<entryPointVersion>
        initHook: boolean
        kernelVersion: GetKernelVersion<entryPointVersion>
        initConfig?: GetKernelVersion<entryPointVersion> extends
            | KERNEL_V3_VERSION_TYPE
            | KERNEL_V4_VERSION_TYPE
            ? Hex[]
            : never
        isEip7702: boolean
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

        const { validatorAddress, enableData } =
            await kernelPluginManager.getValidatorInitData()

        if (satisfies(kernelVersion, ">=0.4.0")) {
            const decodedModuleData = initConfig
                ? initConfig.map((config, index) => {
                      const { functionName, args } = decodeFunctionData({
                          abi: KernelV3_1AccountAbi,
                          data: config
                      })
                      if (
                          functionName !== "installModule" ||
                          args[2].length < 20
                      ) {
                          throw new Error(
                              `Invalid initConfig at index ${index} should be encoded 'installModule' call`
                          )
                      }
                      const [moduleData, internalData] = decodeAbiParameters(
                          [
                              { name: "installData", type: "bytes" },
                              { name: "internalData", type: "bytes" }
                          ],
                          slice(args[2], 20)
                      )

                      return {
                          moduleType: args[0],
                          module: args[1],
                          moduleData,
                          internalData
                      }
                  })
                : []
            if (isEip7702) {
                let kernelNonce: bigint
                try {
                    kernelNonce = await readContract(client, {
                        address: accountAddress,
                        abi: KernelV4_0AccountAbi,
                        functionName: "nonce",
                        args: [0n]
                    })
                } catch {
                    kernelNonce = 0n
                }
                const signature = await signTypedData({
                    types: {
                        InstallPackages: [
                            { name: "nonce", type: "uint256" },
                            { name: "packages", type: "Install[]" }
                        ],
                        Install: [
                            { name: "moduleType", type: "uint256" },
                            { name: "module", type: "address" },
                            { name: "moduleData", type: "bytes" },
                            { name: "internalData", type: "bytes" }
                        ]
                    },
                    primaryType: "InstallPackages",
                    message: {
                        nonce: kernelNonce,
                        packages: decodedModuleData
                    }
                })
                return encodeFunctionData({
                    abi: KernelV4_0AccountAbi,
                    functionName: "installModule",
                    args: [false, kernelNonce, decodedModuleData, signature]
                })
            }

            return encodeFunctionData({
                abi: KernelV4FactoryAbi,
                functionName: "deploy",
                args: [
                    [
                        // root module
                        {
                            moduleType: 1n,
                            module: validatorAddress,
                            moduleData: enableData,
                            internalData: "0x"
                        },
                        ...decodedModuleData
                    ],
                    index
                ]
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
            args: [
                factoryAddress,
                initialisationData,
                toHex(index, { size: 32 })
            ]
        })
    }

    // Helper to generate the init code for the smart account
    const generateInitCode = async () => {
        // if (isEip7702) {
        //     return "0x" as `0x${string}`
        // }
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
            isEip7702,
            useMetaFactory
        })
    }

    const getFactoryArgs = async () => {
        if (isEip7702) {
            if (satisfies(kernelVersion, ">=0.4.0")) {
                return {
                    factory: "0x7702" as Hex,
                    factoryData: await generateInitCode()
                }
            }
            return {
                factory: undefined,
                factoryData: undefined
            }
        }
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
        (isEip7702
            ? (localAccount?.address ?? zeroAddress)
            : await (async () => {
                  const { factory, factoryData } = await getFactoryArgs()
                  if (!factory || !factoryData) {
                      throw new Error("Missing factory address or factory data")
                  }

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

    const signAuthorization = async (
        params?: Eip7702AuthorizationParameters
    ) => {
        const { useReplayableSignature, chain } = params ?? {}
        const currentChainId = await getMemoizedChainId()
        const client7702 =
            !chain || chain.id === currentChainId
                ? client
                : createPublicClient({
                      transport: http(),
                      chain
                  })
        const code = await getCode(client7702, { address: accountAddress })
        // check if account has not activated 7702 with implementation address
        if (
            !code ||
            code.length === 0 ||
            !code
                .toLowerCase()
                .startsWith(
                    `0xef0100${accountImplementationAddress.slice(2).toLowerCase()}`
                )
        ) {
            if (eip7702Auth) {
                // check if the given authorization is for the current chain and account implementation address
                if (
                    !isAddressEqual(
                        eip7702Auth.address,
                        accountImplementationAddress
                    )
                ) {
                    throw new Error(
                        "EIP-7702 authorization delegate address does not match account implementation address"
                    )
                }
                if (
                    eip7702Auth.chainId !== currentChainId &&
                    eip7702Auth.chainId !== 0
                ) {
                    throw new Error(
                        "EIP-7702 authorization chain id does not match current chain id"
                    )
                }
            }

            const auth =
                eip7702Auth ??
                (await signAuthorizationAction(client7702, {
                    account: localAccount as LocalAccount,
                    address: accountImplementationAddress as `0x${string}`,
                    chainId: useReplayableSignature ? 0 : currentChainId
                }))
            const verified = await verifyAuthorization({
                authorization: auth,
                address: accountAddress
            })
            if (!verified) {
                throw new Error("Authorization verification failed")
            }
            return auth
        }
        return undefined
    }

    const signTypedData = async (typedData) => {
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
        const {
            name,
            chainId: metadataChainId,
            version
        } = await getMemoizedAccountMetadata()
        if (isEip7702) {
            const signature = await kernelPluginManager.signTypedData({
                ...typedData,
                domain: {
                    name,
                    chainId: Number(metadataChainId),
                    version,
                    verifyingContract: accountAddress
                }
            })
            return signature
        }

        const typedHash = hashTypedData(typedData)
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
            ) ||
            isEip7702
        ) {
            return signature
        }
        return concatHex([kernelPluginManager.getIdentifier(), signature])
    }

    await checkPluginInstallationStatus()

    return toSmartAccount<KernelSmartAccountImplementation<entryPointVersion>>({
        authorization: isEip7702
            ? {
                  account:
                      (localAccount as PrivateKeyAccount) ??
                      addressToEmptyAccount(accountAddress),
                  address: accountImplementationAddress
              }
            : undefined,
        kernelVersion,
        kernelPluginManager,
        accountImplementationAddress,
        factoryAddress: (await getFactoryArgs()).factory as Address,
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
            if (!factory || !factoryData) {
                throw new Error("Missing factory address or factory data")
            }

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
                    plugins?.hook ? true : undefined
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

            if (plugins?.hook) {
                return encodeCallDataEpV07(calls, callType, true)
            }
            return encodeCallDataEpV07(calls, callType)
        },
        eip7702Authorization: signAuthorization,
        async sign({ hash }) {
            return this.signMessage({ message: hash })
        },
        async signMessage({ message, useReplayableSignature }) {
            if (isEip7702) {
                return kernelPluginManager.signMessage({
                    message
                })
            }
            const messageHash = hashMessage(message)
            const {
                name,
                chainId: metadataChainId,
                version
            } = await getMemoizedAccountMetadata()
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
        signTypedData,
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
