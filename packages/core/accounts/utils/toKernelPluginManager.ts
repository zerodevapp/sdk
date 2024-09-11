import { getEntryPointVersion } from "permissionless"
import type { EntryPoint } from "permissionless/types/entrypoint"
import { satisfies } from "semver"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    concat,
    concatHex,
    maxUint16,
    maxUint192,
    pad,
    toHex,
    zeroAddress
} from "viem"
import { getChainId } from "viem/actions"
import { encodeModuleInstallCallData as encodeModuleInstallCallDataEpV06 } from "../../accounts/kernel/utils/account/ep0_6/encodeModuleInstallCallData.js"
import {
    ONLY_ENTRYPOINT_HOOK_ADDRESS,
    VALIDATOR_MODE,
    VALIDATOR_TYPE
} from "../../constants.js"
import {
    type KernelPluginManager,
    type KernelPluginManagerParams,
    ValidatorMode
} from "../../types/kernel.js"
import { getKernelV3Nonce } from "../kernel/utils/account/ep0_7/getKernelV3Nonce.js"
import { accountMetadata } from "../kernel/utils/common/accountMetadata.js"
import { getActionSelector } from "../kernel/utils/common/getActionSelector.js"
import { getEncodedPluginsData as getEncodedPluginsDataV1 } from "../kernel/utils/plugins/ep0_6/getEncodedPluginsData.js"
import { getPluginsEnableTypedData as getPluginsEnableTypedDataV1 } from "../kernel/utils/plugins/ep0_6/getPluginsEnableTypedData.js"
import { getEncodedPluginsData as getEncodedPluginsDataV2 } from "../kernel/utils/plugins/ep0_7/getEncodedPluginsData.js"
import { getPluginsEnableTypedData as getPluginsEnableTypedDataV2 } from "../kernel/utils/plugins/ep0_7/getPluginsEnableTypedData.js"
import { isPluginInitialized } from "../kernel/utils/plugins/ep0_7/isPluginInitialized.js"

export function isKernelPluginManager<entryPoint extends EntryPoint>(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    plugin: any
): plugin is KernelPluginManager<entryPoint> {
    return plugin.getPluginEnableSignature !== undefined
}

export async function toKernelPluginManager<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        sudo,
        regular,
        hook,
        pluginEnableSignature,
        validatorInitData,
        action,
        validAfter = 0,
        validUntil = 0,
        entryPoint: entryPointAddress,
        kernelVersion,
        chainId
    }: KernelPluginManagerParams<entryPoint>
): Promise<KernelPluginManager<entryPoint>> {
    if (
        (sudo && !satisfies(kernelVersion, sudo?.supportedKernelVersions)) ||
        (regular && !satisfies(kernelVersion, regular?.supportedKernelVersions))
    ) {
        throw new Error(
            "Either sudo or/and regular validator version mismatch. Update to latest plugin package and use the proper plugin version"
        )
    }
    let pluginEnabled: boolean
    const entryPointVersion = getEntryPointVersion(entryPointAddress)
    const activeValidator = regular || sudo
    if (!activeValidator) {
        throw new Error("One of `sudo` or `regular` validator must be set")
    }
    action = {
        selector: action?.selector ?? getActionSelector(entryPointVersion),
        address: action?.address ?? zeroAddress
    }
    if (
        entryPointVersion === "v0.7" &&
        (action.address.toLowerCase() !== zeroAddress.toLowerCase() ||
            action.selector.toLowerCase() !==
                getActionSelector(entryPointVersion).toLowerCase()) &&
        kernelVersion === "0.3.0"
    ) {
        action.hook = {
            address: action.hook?.address ?? ONLY_ENTRYPOINT_HOOK_ADDRESS
        }
    }

    if (!action) {
        throw new Error("Action data must be set")
    }

    const getSignatureData = async (
        accountAddress: Address,
        selector: Hex,
        userOpSignature: Hex = "0x"
    ): Promise<Hex> => {
        if (!action) {
            throw new Error("Action data must be set")
        }
        if (entryPointVersion === "v0.6") {
            if (regular) {
                if (pluginEnabled) {
                    return ValidatorMode.plugin
                }
                if (await isPluginEnabled(accountAddress, selector)) {
                    return ValidatorMode.plugin
                }

                const enableSignature =
                    await getPluginEnableSignature(accountAddress)
                if (!enableSignature) {
                    throw new Error("Enable signature not set")
                }
                return getEncodedPluginsDataV1({
                    accountAddress,
                    enableSignature,
                    action,
                    validator: regular,
                    validUntil,
                    validAfter
                })
            } else if (sudo) {
                return ValidatorMode.sudo
            } else {
                throw new Error(
                    "One of `sudo` or `regular` validator must be set"
                )
            }
        }
        if (regular) {
            if (pluginEnabled) {
                return userOpSignature
            }
            if (await isPluginEnabled(accountAddress, action.selector)) {
                return userOpSignature
            }
            const enableSignature =
                await getPluginEnableSignature(accountAddress)
            return getEncodedPluginsDataV2({
                enableSignature,
                userOpSignature,
                action,
                enableData: await regular.getEnableData(accountAddress),
                hook
            })
        } else if (sudo) {
            return userOpSignature
        } else {
            throw new Error("One of `sudo` or `regular` validator must be set")
        }
    }

    const isPluginEnabled = async (accountAddress: Address, selector: Hex) => {
        if (!action) {
            throw new Error("Action data must be set")
        }
        if (!regular) throw new Error("regular validator not set")
        if (entryPointVersion === "v0.6") {
            return regular.isEnabled(accountAddress, selector)
        }
        const isEnabled =
            (await regular.isEnabled(accountAddress, action.selector)) ||
            (await isPluginInitialized(client, accountAddress, regular.address))
        if (isEnabled) {
            pluginEnabled = true
        }
        return isEnabled
    }

    const getPluginEnableSignature = async (accountAddress: Address) => {
        if (!action) {
            throw new Error("Action data must be set")
        }
        if (pluginEnableSignature) return pluginEnableSignature
        if (!sudo)
            throw new Error(
                "sudo validator not set -- need it to enable the validator"
            )
        if (!regular) throw new Error("regular validator not set")

        const { version } = await accountMetadata(
            client,
            accountAddress,
            kernelVersion
        )
        if (!chainId) {
            chainId = client.chain?.id ?? (await getChainId(client))
        }
        let ownerSig: Hex
        if (entryPointVersion === "v0.6") {
            const typeData = await getPluginsEnableTypedDataV1({
                accountAddress,
                chainId,
                kernelVersion: version ?? kernelVersion,
                action,
                validator: regular,
                validUntil,
                validAfter
            })
            ownerSig = await sudo.signTypedData(typeData)
            pluginEnableSignature = ownerSig
            return ownerSig
        }
        const validatorNonce = await getKernelV3Nonce(client, accountAddress)
        const typedData = await getPluginsEnableTypedDataV2({
            accountAddress,
            chainId,
            kernelVersion: version,
            action,
            hook,
            validator: regular,
            validatorNonce
        })
        ownerSig = await sudo.signTypedData(typedData)
        pluginEnableSignature = ownerSig

        return ownerSig
    }
    const getIdentifier = (isSudo = false) => {
        const validator = (isSudo ? sudo : regular) ?? activeValidator
        return concat([
            VALIDATOR_TYPE[validator.validatorType],
            validator.getIdentifier()
        ])
    }

    const getPluginsEnableTypedData = async (accountAddress: Address) => {
        if (!action) {
            throw new Error("Action data must be set")
        }
        if (!sudo)
            throw new Error(
                "sudo validator not set -- need it to enable the validator"
            )
        if (!regular) throw new Error("regular validator not set")

        const { version } = await accountMetadata(
            client,
            accountAddress,
            kernelVersion
        )

        const validatorNonce = await getKernelV3Nonce(client, accountAddress)

        if (!chainId) {
            chainId = client.chain?.id ?? (await getChainId(client))
        }
        const typedData = await getPluginsEnableTypedDataV2({
            accountAddress,
            chainId,
            kernelVersion: version,
            action,
            validator: regular,
            validatorNonce
        })

        return typedData
    }

    return {
        sudoValidator: sudo,
        regularValidator: regular,
        ...activeValidator,
        hook,
        getIdentifier,
        encodeModuleInstallCallData: async (accountAddress: Address) => {
            if (!action) {
                throw new Error("Action data must be set")
            }
            if (!regular) throw new Error("regular validator not set")
            if (entryPointVersion === "v0.6") {
                return await encodeModuleInstallCallDataEpV06({
                    accountAddress,
                    selector: action.selector,
                    executor: action.address,
                    validator: regular?.address,
                    validUntil,
                    validAfter,
                    enableData: await regular.getEnableData(accountAddress)
                })
            }
            throw new Error("EntryPoint v0.7 not supported yet")
        },
        signUserOperation: async (userOperation) => {
            const userOpSig =
                await activeValidator.signUserOperation(userOperation)
            if (entryPointVersion === "v0.6") {
                return concatHex([
                    await getSignatureData(
                        userOperation.sender,
                        userOperation.callData.toString().slice(0, 10) as Hex
                    ),
                    userOpSig
                ])
            }
            return await getSignatureData(
                userOperation.sender,
                userOperation.callData.toString().slice(0, 10) as Hex,
                userOpSig
            )
        },
        getAction: () => {
            if (!action) {
                throw new Error("Action data must be set")
            }
            return action
        },
        getValidityData: () => ({
            validAfter,
            validUntil
        }),
        getDummySignature: async (userOperation) => {
            const userOpSig =
                await activeValidator.getDummySignature(userOperation)
            if (entryPointVersion === "v0.6") {
                return concatHex([
                    await getSignatureData(
                        userOperation.sender,
                        userOperation.callData.toString().slice(0, 10) as Hex
                    ),
                    userOpSig
                ])
            }
            return await getSignatureData(
                userOperation.sender,
                userOperation.callData.toString().slice(0, 10) as Hex,
                userOpSig
            )
        },
        getNonceKey: async (
            accountAddress = zeroAddress,
            customNonceKey = 0n
        ) => {
            if (!action) {
                throw new Error("Action data must be set")
            }
            if (entryPointVersion === "v0.6") {
                if (customNonceKey > maxUint192) {
                    throw new Error(
                        "Custom nonce key must be equal or less than maxUint192 for v0.6"
                    )
                }

                return await activeValidator.getNonceKey(
                    accountAddress,
                    customNonceKey
                )
            }

            if (customNonceKey > maxUint16)
                throw new Error(
                    "Custom nonce key must be equal or less than 2 bytes(maxUint16) for v0.7"
                )

            const validatorMode =
                !regular ||
                (await isPluginEnabled(accountAddress, action.selector))
                    ? VALIDATOR_MODE.DEFAULT
                    : VALIDATOR_MODE.ENABLE
            const validatorType = regular
                ? VALIDATOR_TYPE[regular.validatorType]
                : VALIDATOR_TYPE.SUDO
            const encoding = pad(
                concatHex([
                    validatorMode, // 1 byte
                    validatorType, // 1 byte
                    pad(activeValidator.getIdentifier(), {
                        size: 20,
                        dir: "right"
                    }), // 20 bytes
                    pad(
                        toHex(
                            await activeValidator.getNonceKey(
                                accountAddress,
                                customNonceKey
                            )
                        ),
                        {
                            size: 2
                        }
                    ) // 2 byte
                ]),
                { size: 24 }
            )
            const encodedNonceKey = BigInt(encoding)
            return encodedNonceKey
        },
        getPluginEnableSignature,
        getPluginsEnableTypedData,
        getValidatorInitData: async () => {
            if (validatorInitData) return validatorInitData
            return {
                validatorAddress: sudo?.address ?? activeValidator.address,

                enableData:
                    (await sudo?.getEnableData()) ??
                    (await activeValidator.getEnableData()),

                identifier: pad(getIdentifier(true), { size: 21, dir: "right" })
            }
        },
        signUserOperationWithActiveValidator: async (userOperation) => {
            return activeValidator.signUserOperation(userOperation)
        }
    }
}
