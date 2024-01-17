import { getAction } from "permissionless"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    concatHex,
    hexToBigInt,
    pad,
    toHex
} from "viem"
import { getChainId, getStorageAt } from "viem/actions"
import { LATEST_KERNEL_VERSION } from "../../constants"
import type {
    KernelPluginManager,
    KernelPluginManagerParams
} from "../../types/kernel"
import { getKernelVersion } from "../../utils"
import { KERNEL_ADDRESSES } from "../kernel/createKernelAccount"

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
        validator,
        defaultValidator,
        pluginEnableSignature,
        validatorInitData
    }: KernelPluginManagerParams
): Promise<KernelPluginManager> {
    const chainId = await getChainId(client)
    return {
        ...validator,
        getPluginEnableSignature: async (accountAddress: Address) => {
            if (pluginEnableSignature) return pluginEnableSignature
            if (!defaultValidator) return "0x"
            const executorData = validator.getExecutorData()
            if (!executorData.selector || !executorData.executor) {
                throw new Error("Invalid executor data")
            }
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
            const ownerSig = await defaultValidator.signTypedData({
                domain: {
                    name: "Kernel",
                    version: kernelImplAddr
                        ? getKernelVersion(kernelImplAddr)
                        : LATEST_KERNEL_VERSION,
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
                            pad(toHex(executorData.validUntil ?? 0), {
                                size: 6
                            }),
                            pad(toHex(executorData.validAfter ?? 0), {
                                size: 6
                            }),
                            validator.address
                        ]),
                        { size: 32 }
                    ),
                    executor: executorData.executor as Address,
                    enableData: await validator.getEnableData(accountAddress)
                },
                primaryType: "ValidatorApproved"
            })
            return ownerSig
        },
        getValidatorInitData: async () => {
            if (validatorInitData) return validatorInitData
            return {
                validatorAddress:
                    defaultValidator?.address ?? validator.address,
                enableData:
                    (await defaultValidator?.getEnableData()) ??
                    (await validator.getEnableData())
            }
        }
    }
}
