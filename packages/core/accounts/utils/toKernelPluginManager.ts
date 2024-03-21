import { getAction, getEntryPointVersion } from "permissionless"
import type { EntryPoint } from "permissionless/types/entrypoint"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    concat,
    concatHex,
    hexToBigInt,
    pad,
    toFunctionSelector,
    toHex,
    zeroAddress,
    encodeAbiParameters,
    parseAbiParameters
} from "viem"
import { getChainId, readContract } from "viem/actions"
import {
    type KernelPluginManager,
    type KernelPluginManagerParams,
    ValidatorMode
} from "../../types/kernel.js"
import { getKernelVersion } from "../../utils.js"
import { getKernelImplementationAddress } from "./6492.js"
import { KernelModuleIsInitializedAbi } from "../kernel/abi/kernel_v_3_0_0/KernelModuleAbi.js"
import { VALIDATOR_MODE, VALIDATOR_TYPE } from "../../constants.js"
import { KernelV3AccountAbi } from "../kernel/abi/kernel_v_3_0_0/KernelAccountAbi.js"

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
        pluginEnableSignature,
        validatorInitData,
        executorData = {
            executor: zeroAddress,
            selector: toFunctionSelector(
                "execute(address, uint256, bytes, uint8)"
            )
        },
        validAfter = 0,
        validUntil = 0,
        entryPoint: entryPointAddress
    }: KernelPluginManagerParams<entryPoint>
): Promise<KernelPluginManager<entryPoint>> {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)
    const chainId = await getChainId(client)
    const activeValidator = regular || sudo
    if (!activeValidator) {
        throw new Error("One of `sudo` or `regular` validator must be set")
    }
    const getValidatorSignature = async (
        accountAddress: Address,
        selector: Hex,
        sig?: Hex
    ): Promise<Hex> => {
        if (entryPointVersion === "v0.6") {
            if (regular) {
                if (await regular.isEnabled(accountAddress, selector)) {
                    return ValidatorMode.plugin
                }

                const enableSignature = await getPluginEnableSignature(
                    accountAddress
                )
                const enableData = await regular.getEnableData(accountAddress)
                const enableDataLength = enableData.length / 2 - 1
                if (!enableSignature) {
                    throw new Error("Enable signature not set")
                }

                return concat([
                    ValidatorMode.enable,
                    pad(toHex(validUntil), { size: 6 }), // 6 bytes 4 - 10
                    pad(toHex(validAfter), { size: 6 }), // 6 bytes 10 - 16
                    pad(regular.address, { size: 20 }), // 20 bytes 16 - 36
                    pad(executorData.executor, { size: 20 }), // 20 bytes 36 - 56
                    pad(toHex(enableDataLength), { size: 32 }), // 32 bytes 56 - 88
                    enableData, // 88 - 88 + enableData.length
                    pad(toHex(enableSignature.length / 2 - 1), { size: 32 }), // 32 bytes 88 + enableData.length - 120 + enableData.length
                    enableSignature // 120 + enableData.length - 120 + enableData.length + enableSignature.length
                ])
            } else if (sudo) {
                return ValidatorMode.sudo
            } else {
                throw new Error(
                    "One of `sudo` or `regular` validator must be set"
                )
            }
        }
        if (regular) {
            if (
                (await isPluginInitialized_7579(accountAddress)) ||
                (await regular.isEnabled(accountAddress, selector))
            ) {
                return sig ?? "0x"
            }
            const enableData = await regular.getEnableData(accountAddress)
            const enableSignature = await getPluginEnableSignature(
                accountAddress
            )
            return concat([
                zeroAddress, // hook address 20 bytes
                encodeAbiParameters(
                    parseAbiParameters(
                        "bytes validatorData, bytes hookData, bytes selectorData, bytes enableSig, bytes userOpSig"
                    ),
                    [
                        enableData,
                        "0x",
                        concat([
                            executorData.selector,
                            executorData.executor,
                            zeroAddress,
                            "0x"
                        ]),
                        enableSignature,
                        sig ?? "0x"
                    ]
                )
            ])
        } else if (sudo) {
            return sig ?? "0x"
        } else {
            throw new Error("One of `sudo` or `regular` validator must be set")
        }
    }

    const isPluginInitialized_7579 = async (
        accountAddress: Address
    ): Promise<boolean> => {
        try {
            return await getAction(
                client,
                readContract
            )({
                abi: KernelModuleIsInitializedAbi,
                address: activeValidator.address,
                functionName: "isInitialized",
                args: [accountAddress]
            })
        } catch (error) {}
        return false
    }

    const getPluginEnableSignature = async (accountAddress: Address) => {
        if (pluginEnableSignature) return pluginEnableSignature
        if (!sudo)
            throw new Error(
                "sudo validator not set -- need it to enable the validator"
            )
        if (!regular) throw new Error("regular validator not set")

        const kernelImplAddr = await getKernelImplementationAddress(
            client,
            accountAddress
        )
        const kernelVersion = getKernelVersion(
            entryPointAddress,
            kernelImplAddr
        )
        let ownerSig: Hex
        if (entryPointVersion === "v0.6") {
            ownerSig = await sudo.signTypedData({
                domain: {
                    name: "Kernel",
                    version: kernelVersion,
                    chainId,
                    verifyingContract: accountAddress
                },
                types: {
                    ValidatorApproved: [
                        { name: "sig", type: "bytes4" },
                        { name: "validatorData", type: "uint256" },
                        { name: "executor", type: "address" },
                        { name: "enableData", type: "bytes" }
                    ]
                },
                message: {
                    sig: executorData.selector,
                    validatorData: hexToBigInt(
                        concatHex([
                            pad(toHex(validUntil ?? 0), {
                                size: 6
                            }),
                            pad(toHex(validAfter ?? 0), {
                                size: 6
                            }),
                            regular.address
                        ]),
                        { size: 32 }
                    ),
                    executor: executorData.executor as Address,
                    enableData: await regular.getEnableData(accountAddress)
                },
                primaryType: "ValidatorApproved"
            })
            pluginEnableSignature = ownerSig
            return ownerSig
        }
        ownerSig = await sudo.signTypedData({
            domain: {
                name: "Kernel",
                version: kernelVersion,
                chainId,
                verifyingContract: accountAddress
            },
            types: {
                Enable: [
                    { name: "validationId", type: "bytes21" },
                    { name: "nonce", type: "uint32" },
                    { name: "hook", type: "address" },
                    { name: "validatorData", type: "bytes" },
                    { name: "hookData", type: "bytes" },
                    { name: "selectorData", type: "bytes" }
                ]
            },
            message: {
                validationId: concat([
                    activeValidator.isPermissionValidator
                        ? VALIDATOR_TYPE.PERMISSION
                        : VALIDATOR_TYPE.SECONDARY,
                    activeValidator?.isPermissionValidator
                        ? // @ts-ignore
                          pad(regular.getPermissionId() as Hex, {
                              size: 20,
                              dir: "right"
                          })
                        : activeValidator.address
                ]),
                nonce: await getKernelV3Nonce(accountAddress),
                hook: zeroAddress,
                validatorData: await regular.getEnableData(accountAddress),
                hookData: "0x",
                selectorData: concat([
                    executorData.selector,
                    executorData.executor,
                    zeroAddress,
                    "0x"
                ])
            },
            primaryType: "Enable"
        })

        return ownerSig
    }

    const getKernelV3Nonce = async (
        accountAddress: Address
    ): Promise<number> => {
        try {
            const nonce = await getAction(
                client,
                readContract
            )({
                abi: KernelV3AccountAbi,
                address: accountAddress,
                functionName: "currentNonce",
                args: []
            })
            return nonce
        } catch (error) {
            return 2
        }
    }

    return {
        ...activeValidator,
        signUserOperation: async (userOperation) => {
            const userOpSig = await activeValidator.signUserOperation(
                userOperation
            )
            if (entryPointVersion === "v0.6") {
                return concatHex([
                    await getValidatorSignature(
                        userOperation.sender,
                        userOperation.callData.toString().slice(0, 10) as Hex
                    ),
                    userOpSig
                ])
            }
            return await getValidatorSignature(
                userOperation.sender,
                userOperation.callData.toString().slice(0, 10) as Hex,
                userOpSig
            )
        },
        getExecutorData: () => executorData,
        getValidityData: () => ({
            validAfter,
            validUntil
        }),
        getDummySignature: async (userOperation) => {
            const userOpSig = await activeValidator.getDummySignature(
                userOperation
            )
            if (entryPointVersion === "v0.6") {
                return concatHex([
                    await getValidatorSignature(
                        userOperation.sender,
                        userOperation.callData.toString().slice(0, 10) as Hex
                    ),
                    userOpSig
                ])
            }
            return await getValidatorSignature(
                userOperation.sender,
                userOperation.callData.toString().slice(0, 10) as Hex,
                userOpSig
            )
        },
        getNonceKey: async (accountAddress = zeroAddress) => {
            if (entryPointVersion === "v0.6")
                return await activeValidator.getNonceKey()

            return BigInt(
                pad(
                    concatHex([
                        !regular ||
                        (await regular.isEnabled(
                            accountAddress,
                            executorData.selector
                        )) ||
                        (await isPluginInitialized_7579(accountAddress))
                            ? VALIDATOR_MODE.DEFAULT
                            : VALIDATOR_MODE.ENABLE, // 1 byte
                        regular
                            ? regular.isPermissionValidator
                                ? VALIDATOR_TYPE.PERMISSION
                                : VALIDATOR_TYPE.SECONDARY
                            : VALIDATOR_TYPE.SUDO, // 1 byte
                        regular?.isPermissionValidator
                            ? // @ts-ignore
                              pad(regular.getPermissionId(), {
                                  size: 20,
                                  dir: "right"
                              })
                            : activeValidator.address, // 20 bytes
                        pad(toHex(await activeValidator.getNonceKey()), {
                            size: 2
                        }) // 10 byte
                    ]),
                    { size: 24 }
                )
            )
        },
        getPluginEnableSignature,
        getValidatorInitData: async () => {
            if (validatorInitData) return validatorInitData
            return {
                validatorAddress: sudo?.address ?? activeValidator.address,

                enableData:
                    (await sudo?.getEnableData()) ??
                    (await activeValidator.getEnableData())
            }
        }
    }
}
