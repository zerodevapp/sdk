import {
    KERNEL_FEATURES,
    KernelFactoryStakerAbi,
    KernelV3AccountAbi,
    KernelV3InitAbi,
    KernelV3_1AccountAbi,
    eip712WrapHash,
    encodeCallDataEpV07,
    hasKernelFeature,
    toSigner,
    validateKernelVersionWithEntryPoint
} from "@zerodev/sdk"
import {
    type CallArgs,
    type KernelSmartAccountImplementation,
    getPluginInstallCallData,
    toKernelPluginManager
} from "@zerodev/sdk/accounts"
import {
    getAccountNonce,
    getKernelImplementationAddress,
    getSenderAddress,
    isPluginInstalled
} from "@zerodev/sdk/actions"
import {
    DUMMY_ECDSA_SIG,
    KernelVersionToAddressesMap,
    MAGIC_VALUE_SIG_REPLAYABLE,
    VALIDATOR_MODE,
    VALIDATOR_TYPE
} from "@zerodev/sdk/constants"
import type {
    EntryPointType,
    GetEntryPointAbi,
    GetKernelVersion,
    KERNEL_V3_VERSION_TYPE,
    PluginMigrationData,
    Signer
} from "@zerodev/sdk/types"
import {
    type Address,
    type Client,
    type Hex,
    type TypedDataDefinition,
    concatHex,
    createNonceManager,
    encodeFunctionData,
    getTypesForEIP712Domain,
    hashMessage,
    hashTypedData,
    isAddressEqual,
    maxUint16,
    pad,
    toHex,
    validateTypedData,
    zeroAddress
} from "viem"
import {
    type EntryPointVersion,
    type SmartAccount,
    type UserOperation,
    entryPoint06Abi,
    entryPoint07Abi,
    entryPoint07Address,
    getUserOperationHash,
    toSmartAccount
} from "viem/account-abstraction"
import { getChainId, signMessage } from "viem/actions"
import { getAction } from "viem/utils"
import {
    getValidatorAddress,
    signerToEcdsaValidator
} from "../toECDSAValidatorPlugin.js"

export type CreateEcdsaKernelMigrationAccountReturnType<
    entryPointVersion extends EntryPointVersion = "0.7"
> = SmartAccount<KernelSmartAccountImplementation<entryPointVersion>>

export type CreateEcdsaKernelMigrationAccountParameters<
    entryPointVersion extends EntryPointVersion
> = {
    entryPoint: EntryPointType<entryPointVersion>
    signer: Signer
    index?: bigint
    address?: Address
    migrationVersion: {
        from: GetKernelVersion<entryPointVersion>
        to: GetKernelVersion<entryPointVersion>
    }
    pluginMigrations?: PluginMigrationData[]
}

const getKernelInitData = <entryPointVersion extends EntryPointVersion>({
    entryPointVersion: _entryPointVersion,
    kernelVersion,
    validatorAddress,
    validatorData
}: {
    entryPointVersion: entryPointVersion
    kernelVersion: GetKernelVersion<entryPointVersion>
    validatorAddress: Address
    validatorData: Hex
}) => {
    const validatorId = concatHex([VALIDATOR_TYPE.SECONDARY, validatorAddress])
    if (kernelVersion === "0.3.0") {
        return encodeFunctionData({
            abi: KernelV3InitAbi,
            functionName: "initialize",
            args: [validatorId, zeroAddress, validatorData, "0x"]
        })
    }
    return encodeFunctionData({
        abi: KernelV3_1AccountAbi,
        functionName: "initialize",
        args: [validatorId, zeroAddress, validatorData, "0x", []]
    })
}

/**
 * Get the account initialization code for a kernel smart account
 * @param entryPoint
 * @param owner
 * @param index
 * @param factoryAddress
 * @param ecdsaValidatorAddress
 */
const getAccountInitCode = async <entryPointVersion extends EntryPointVersion>({
    entryPointVersion,
    kernelVersion,
    validatorData,
    index,
    factoryAddress,
    validatorAddress
}: {
    kernelVersion: GetKernelVersion<entryPointVersion>
    entryPointVersion: entryPointVersion
    validatorData: Hex
    index: bigint
    factoryAddress: Address
    validatorAddress: Address
}): Promise<Hex> => {
    const initializationData = getKernelInitData({
        entryPointVersion,
        kernelVersion,
        validatorAddress,
        validatorData
    })
    return encodeFunctionData({
        abi: KernelFactoryStakerAbi,
        functionName: "deployWithFactory",
        args: [factoryAddress, initializationData, toHex(index, { size: 32 })]
    })
}

const isKernelUpgraded = async (
    client: Client,
    accountAddress: Address,
    toKernelVersion: GetKernelVersion<EntryPointVersion>
) => {
    // Get current kernel implementation
    const kernelImplementation = await getKernelImplementationAddress(client, {
        address: accountAddress
    })

    return isAddressEqual(
        kernelImplementation,
        KernelVersionToAddressesMap[toKernelVersion]
            .accountImplementationAddress
    )
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
export async function createEcdsaKernelMigrationAccount<
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    {
        entryPoint,
        signer,
        index = 0n,
        address,
        migrationVersion,
        pluginMigrations
    }: CreateEcdsaKernelMigrationAccountParameters<entryPointVersion>
): Promise<CreateEcdsaKernelMigrationAccountReturnType<entryPointVersion>> {
    if (entryPoint.version === "0.6") {
        throw new Error("EntryPointV0.6 is not supported for migration")
    }
    validateKernelVersionWithEntryPoint(
        entryPoint.version,
        migrationVersion.from
    )
    validateKernelVersionWithEntryPoint(entryPoint.version, migrationVersion.to)
    const fromAddresses =
        KernelVersionToAddressesMap[
            migrationVersion.from as KERNEL_V3_VERSION_TYPE
        ]
    // const _toAddresses =
    //     KernelVersionToAddressesMap[
    //         migrationVersion.to as KERNEL_V3_VERSION_TYPE
    //     ]

    const fromValidatorAddress = getValidatorAddress(
        entryPoint,
        migrationVersion.from
    )
    const toValidatorAddress = getValidatorAddress(
        entryPoint,
        migrationVersion.to
    )
    const viemSigner = await toSigner({ signer })

    let chainId: number

    const getMemoizedChainId = async () => {
        if (chainId) return chainId
        chainId = client.chain
            ? client.chain.id
            : await getAction(client, getChainId, "getChainId")({})
        return chainId
    }

    // Helper to generate the init code for the smart account
    const generateInitCode = async () => {
        return getAccountInitCode<entryPointVersion>({
            entryPointVersion: entryPoint.version,
            factoryAddress: fromAddresses.factoryAddress,
            index,
            kernelVersion: migrationVersion.from,
            validatorAddress: fromValidatorAddress,
            validatorData: viemSigner.address
        })
    }

    const getFactoryArgs = async () => {
        return {
            factory: fromAddresses.metaFactoryAddress ?? zeroAddress,
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

    let kernelUpgraded = await isKernelUpgraded(
        client,
        accountAddress,
        migrationVersion.to
    )

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

    const _entryPoint = {
        address: entryPoint?.address ?? entryPoint07Address,
        abi: ((entryPoint?.version ?? "0.7") === "0.6"
            ? entryPoint06Abi
            : entryPoint07Abi) as GetEntryPointAbi<entryPointVersion>,
        version: entryPoint?.version ?? "0.7"
    } as const

    return toSmartAccount<KernelSmartAccountImplementation<entryPointVersion>>({
        kernelVersion: migrationVersion.to,
        kernelPluginManager: await toKernelPluginManager<entryPointVersion>(
            client,
            {
                entryPoint,
                kernelVersion: migrationVersion.to,
                chainId: await getMemoizedChainId(),
                sudo: await signerToEcdsaValidator(client, {
                    entryPoint,
                    signer: viemSigner,
                    kernelVersion: migrationVersion.to,
                    validatorAddress: toValidatorAddress
                })
            }
        ),
        factoryAddress: (await getFactoryArgs()).factory,
        generateInitCode,
        accountImplementationAddress:
            KernelVersionToAddressesMap[migrationVersion.to]
                .accountImplementationAddress,
        encodeModuleInstallCallData: async () => {
            throw new Error("Not implemented")
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
            throw new Error("Not implemented")
        },
        async encodeCalls(calls, callType) {
            // Check plugin status only if we have pending plugins
            await checkPluginInstallationStatus()
            const pluginInstallCalls: CallArgs[] = []

            // Add plugin installation calls if needed
            if (
                pluginCache.pendingPlugins.length > 0 &&
                entryPoint.version === "0.7"
            ) {
                // convert map into for loop
                for (const plugin of pluginCache.pendingPlugins) {
                    pluginInstallCalls.push(
                        getPluginInstallCallData(accountAddress, plugin)
                    )
                }
            }

            kernelUpgraded =
                kernelUpgraded ||
                (await isKernelUpgraded(
                    client,
                    accountAddress,
                    migrationVersion.to
                ))
            let _calls = calls
            if (!kernelUpgraded) {
                const implementation =
                    KernelVersionToAddressesMap[migrationVersion.to]
                        .accountImplementationAddress

                const upgradeCall = {
                    to: accountAddress,
                    data: encodeFunctionData({
                        abi: KernelV3AccountAbi,
                        functionName: "upgradeTo",
                        args: [implementation]
                    }),
                    value: 0n
                }
                if (!isAddressEqual(fromValidatorAddress, toValidatorAddress)) {
                    const rootValidatorId = concatHex([
                        VALIDATOR_TYPE.SECONDARY,
                        pad(toValidatorAddress, {
                            size: 20,
                            dir: "right"
                        })
                    ])
                    const updateValidatorCall = {
                        to: accountAddress,
                        data: encodeFunctionData({
                            abi: KernelV3_1AccountAbi,
                            functionName: "changeRootValidator",
                            args: [
                                rootValidatorId,
                                zeroAddress,
                                viemSigner.address,
                                "0x"
                            ]
                        }),
                        value: 0n
                    }
                    _calls = [
                        upgradeCall,
                        updateValidatorCall,
                        ...pluginInstallCalls,
                        ...calls
                    ]
                }
                _calls = [upgradeCall, ...pluginInstallCalls, ...calls]
            } else {
                _calls = [...pluginInstallCalls, ...calls]
            }
            return encodeCallDataEpV07(_calls, callType)
        },
        async sign({ hash }) {
            return this.signMessage({ message: hash })
        },
        async signMessage({ message, useReplayableSignature }) {
            kernelUpgraded =
                kernelUpgraded ||
                (await isKernelUpgraded(
                    client,
                    accountAddress,
                    migrationVersion.to
                ))
            const messageHash = hashMessage(message)
            const version_ = kernelUpgraded
                ? migrationVersion.to
                : migrationVersion.from
            const version = version_ === "0.3.0" ? "0.3.0-beta" : version_
            const wrappedMessageHash = await eip712WrapHash(
                messageHash,
                {
                    name: "Kernel",
                    chainId: chainId,
                    version,
                    verifyingContract: accountAddress
                },
                useReplayableSignature
            )
            let signature = await viemSigner.signMessage({
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

            return concatHex([VALIDATOR_TYPE.SUDO, signature])
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
            kernelUpgraded =
                kernelUpgraded ||
                (await isKernelUpgraded(
                    client,
                    accountAddress,
                    migrationVersion.to
                ))

            const version_ = kernelUpgraded
                ? migrationVersion.to
                : migrationVersion.from
            const version = version_ === "0.3.0" ? "0.3.0-beta" : version_
            const wrappedMessageHash = await eip712WrapHash(typedHash, {
                name: "Kernel",
                chainId: chainId,
                version,
                verifyingContract: accountAddress
            })
            const signature = await viemSigner.signMessage({
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
            return concatHex([VALIDATOR_TYPE.SUDO, signature])
        },
        // Get the nonce of the smart account
        async getNonce(_args) {
            const key = getNonceKeyWithEncoding(
                fromValidatorAddress,
                _args?.key
            )
            return getAccountNonce(client, {
                address: accountAddress,
                entryPointAddress: entryPoint.address,
                key
            })
        },
        async getStubSignature() {
            return DUMMY_ECDSA_SIG
        },

        // Sign a user operation
        async signUserOperation(parameters) {
            const { chainId = await getMemoizedChainId(), ...userOperation } =
                parameters
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    sender: userOperation.sender ?? accountAddress,
                    signature: "0x"
                } as UserOperation<entryPointVersion>,
                entryPointAddress: entryPoint.address,
                entryPointVersion: entryPoint.version,
                chainId: chainId
            })
            const signature = await signMessage(client, {
                account: viemSigner,
                message: { raw: hash }
            })
            return signature
        }
    }) as Promise<
        CreateEcdsaKernelMigrationAccountReturnType<entryPointVersion>
    >
}

export const getNonceKeyWithEncoding = (
    validatorAddress: Address,
    nonceKey = 0n
) => {
    if (nonceKey > maxUint16)
        throw new Error(
            "nonce key must be equal or less than 2 bytes(maxUint16) for Kernel version v0.7"
        )

    const validatorMode = VALIDATOR_MODE.DEFAULT
    const validatorType = VALIDATOR_TYPE.SUDO
    const encoding = pad(
        concatHex([
            validatorMode, // 1 byte
            validatorType, // 1 byte
            validatorAddress, // 20 bytes
            toHex(nonceKey, { size: 2 }) // 2 byte
        ]),
        { size: 24 }
    ) // 24 bytes

    return BigInt(encoding)
}
