import {
    type Address,
    type Assign,
    type Client,
    type EncodeDeployDataParameters,
    type Hex,
    type SignableMessage,
    type TypedDataDefinition,
    concatHex,
    createNonceManager,
    getTypesForEIP712Domain,
    hashMessage,
    hashTypedData,
    validateTypedData,
    zeroAddress,
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
} from "viem/accounts"
import { getChainId, getCode, signAuthorization as signAuthorizationAction } from "viem/actions"
import { getAction, verifyAuthorization } from "viem/utils"
import {
    getAccountNonce,
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
import { KERNEL_FEATURES, hasKernelFeature } from "../../utils.js"
import { validateKernelVersionWithEntryPoint } from "../../utils.js"
import {
    toKernelPluginManager
} from "../utils/toKernelPluginManager.js"
import { encodeCallData as encodeCallDataEpV06 } from "./utils/account/ep0_6/encodeCallData.js"
import { encodeDeployCallData as encodeDeployCallDataV06 } from "./utils/account/ep0_6/encodeDeployCallData.js"
import { encodeCallData as encodeCallDataEpV07 } from "./utils/account/ep0_7/encodeCallData.js"
import { encodeDeployCallData as encodeDeployCallDataV07 } from "./utils/account/ep0_7/encodeDeployCallData.js"
import { accountMetadata } from "./utils/common/accountMetadata.js"
import { eip712WrapHash } from "./utils/common/eip712WrapHash.js"
import { getPluginInstallCallData } from "./utils/plugins/ep0_7/getPluginInstallCallData.js"
import type { CallArgs } from "./utils/types.js"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator/toECDSAValidatorPlugin.js"
import { type Signer } from "../../types/utils.js"
import { toSigner } from "../../utils/toSigner.js"

type SignMessageParameters = {
    message: SignableMessage
    useReplayableSignature?: boolean
}

export type KernelSmartAccount7702Implementation<
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
        factoryAddress: Address | undefined
        accountImplementationAddress: Address
        generateInitCode: () => Promise<Hex>
        encodeModuleInstallCallData: () => Promise<Hex>
        encodeDeployCallData: ({
            abi,
            args,
            bytecode
        }: EncodeDeployDataParameters) => Promise<Hex>
        signMessage: (parameters: SignMessageParameters) => Promise<Hex>
        signAuthorization: () => Promise<SignAuthorizationReturnType | undefined>
    }
>

export type Create7702KernelAccountReturnType<
    entryPointVersion extends EntryPointVersion = "0.7"
> = SmartAccount<KernelSmartAccount7702Implementation<entryPointVersion>>

export type Create7702KernelAccountParameters<
    entryPointVersion extends EntryPointVersion,
> = {
    signer : Signer
    plugins?:
        | Omit<
              KernelPluginManagerParams<entryPointVersion>,
              "entryPoint" | "kernelVersion"
          >
        | KernelPluginManager<entryPointVersion>
    entryPoint: EntryPointType<entryPointVersion>
    accountImplementationAddress?: Address
    kernelVersion: GetKernelVersion<entryPointVersion>
    pluginMigrations?: PluginMigrationData[]
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
export async function create7702KernelAccount<
    entryPointVersion extends EntryPointVersion,
>(
    client: Client,
    {
        signer,
        plugins,
        entryPoint,
        accountImplementationAddress: _accountImplementationAddress,
        kernelVersion,
        pluginMigrations
    }: Create7702KernelAccountParameters<entryPointVersion>
): Promise<Create7702KernelAccountReturnType<entryPointVersion>> {
    const { accountImplementationAddress } =
        getDefaultAddresses(entryPoint.version, kernelVersion, {
            accountImplementationAddress: _accountImplementationAddress,
            factoryAddress: undefined,
            metaFactoryAddress: undefined
        })

    let chainId: number

    // format to local account
    let address : Address | undefined
    if (typeof signer === 'object' && signer !== null && 'account' in signer) {
        address = signer.account?.address as Address
    }
    const localAccount = await toSigner({ signer, address })
    const accountAddress = localAccount.address

    const getMemoizedChainId = async () => {
        if (chainId) return chainId
        chainId = client.chain
            ? client.chain.id
            : await getAction(client, getChainId, "getChainId")({})
        return chainId
    }

    const kernelPluginManager = await toKernelPluginManager<entryPointVersion>(client, {
        sudo: await signerToEcdsaValidator(client, {
            signer: localAccount,
            entryPoint,
            kernelVersion,
        }),
        entryPoint,
        kernelVersion,
        chainId: await getMemoizedChainId()
    })

    // Helper to generate the init code for the smart account
    const generateInitCode = async () => {
        return "0x" as `0x${string}`
    }

    const getFactoryArgs = async () => {
        return {
            factory: undefined,
            factoryData: undefined
        }
    }

    const signAuthorization: () => Promise<SignAuthorizationReturnType | undefined> = async () => {
        const code = await getCode(client, { address: accountAddress })
        console.log("code", code)
        // check if account has not activated 7702 with implementation address
        if ( !code || code.length == 0 || !code.toLowerCase().startsWith(`0xef0100` + accountImplementationAddress.slice(2).toLowerCase())) {
            console.log("DEBUG : ", accountImplementationAddress.slice(2).toLowerCase())
            console.log("DEBUG : ", `0xef0100` + accountImplementationAddress.slice(2).toLowerCase())
            if(code){
                console.log("DEBUG : ", code.toLowerCase().startsWith(`0xef0100` + accountImplementationAddress.slice(2).toLowerCase()))
            }
            const auth = await signAuthorizationAction(client, {
                account: localAccount,
                address: accountImplementationAddress as `0x${string}`,
                chainId: await getMemoizedChainId()
            });
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

    await checkPluginInstallationStatus()

    return toSmartAccount<KernelSmartAccount7702Implementation<entryPointVersion>>({
        kernelVersion,
        kernelPluginManager,
        accountImplementationAddress,
        factoryAddress: undefined,
        generateInitCode,
        encodeModuleInstallCallData: async () => {
            return await kernelPluginManager.encodeModuleInstallCallData(
                accountAddress
            )
        },
        nonceKeyManager: createNonceManager({
            source: { get: () => 0, set: () => {} }
        }),
        client: client as any,
        entryPoint: _entryPoint,
        getFactoryArgs,
        async getAddress() {
            return accountAddress
        },
        signAuthorization,
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
                parameters;
            let authorization = await this.signAuthorization()
            return kernelPluginManager.signUserOperation({
                ...userOperation,
                sender: userOperation.sender ?? (await this.getAddress()),
                chainId,
                authorization
            })
        }
    }) as Promise<Create7702KernelAccountReturnType<entryPointVersion>>
}
