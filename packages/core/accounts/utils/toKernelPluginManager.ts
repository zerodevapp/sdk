import { getAction } from "permissionless"
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
    zeroAddress
} from "viem"
import { getChainId, getStorageAt } from "viem/actions"
import { LATEST_KERNEL_VERSION } from "../../constants.js"
import {
    type KernelPluginManager,
    type KernelPluginManagerParams,
    ValidatorMode
} from "../../types/kernel.js"
import { getKernelVersion } from "../../utils.js"

export function isKernelPluginManager(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    plugin: any
): plugin is KernelPluginManager {
    return plugin.getPluginEnableSignature !== undefined
}

export async function toKernelPluginManager<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain>,
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
        kernelVersion
    }: KernelPluginManagerParams
): Promise<KernelPluginManager> {
    const chainId = await getChainId(client)
    const getValidatorSignature = async (
        accountAddress: Address,
        selector: Hex
    ): Promise<Hex> => {
        if (regular) {
            if (await regular.isEnabled(accountAddress, selector)) {
                return ValidatorMode.plugin
            }

            const enableSignature =
                await getPluginEnableSignature(accountAddress)
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
            throw new Error("One of `sudo` or `regular` validator must be set")
        }
    }

    const getPluginEnableSignature = async (accountAddress: Address) => {
        if (pluginEnableSignature) return pluginEnableSignature
        if (!sudo)
            throw new Error(
                "sudo validator not set -- need it to enable the validator"
            )
        if (!regular) throw new Error("regular validator not set")
        let kernelImplAddr: Address | undefined
        try {
            const strgAddr = await getAction(
                client,
                getStorageAt
            )({
                address: accountAddress,
                slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
            })
            if (strgAddr) kernelImplAddr = `0x${strgAddr.slice(26)}` as Hex
        } catch (error) {}
        const ownerSig = await sudo.signTypedData({
            domain: {
                name: "Kernel",
                version:
                    kernelVersion ??
                    (kernelImplAddr
                        ? getKernelVersion(kernelImplAddr)
                        : LATEST_KERNEL_VERSION),
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

    const activeValidator = regular || sudo
    if (!activeValidator) {
        throw new Error("One of `sudo` or `regular` validator must be set")
    }

    return {
        ...activeValidator,
        signUserOperation: async (userOperation) => {
            return concatHex([
                await getValidatorSignature(
                    userOperation.sender,
                    userOperation.callData.toString().slice(0, 10) as Hex
                ),
                await activeValidator.signUserOperation(userOperation)
            ])
        },
        getExecutorData: () => executorData,
        getValidityData: () => ({
            validAfter,
            validUntil
        }),
        getDummySignature: async (userOperation) => {
            return concatHex([
                await getValidatorSignature(
                    userOperation.sender,
                    userOperation.callData.toString().slice(0, 10) as Hex
                ),
                await activeValidator.getDummySignature(userOperation)
            ])
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
