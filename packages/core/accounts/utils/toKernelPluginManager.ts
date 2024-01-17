import { getAction } from "permissionless"
import {
    KernelPluginManager,
    KernelPluginManagerParams,
    KernelValidator
} from "../../types/kernel"
import { KERNEL_ADDRESSES } from "../kernel/createKernelAccount"
import {
    Address,
    Chain,
    Client,
    Hex,
    Transport,
    concatHex,
    hexToBigInt,
    pad,
    toHex
} from "viem"
import { getChainId, getStorageAt } from "viem/actions"
import { getKernelVersion } from "../../utils"

export function isKernelPluginManager(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    plugin: any
): plugin is KernelPluginManager {
    return plugin.getEnableSignature !== undefined
}

export async function toKernelPluginManager<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain>,
    {
        validator,
        defaultValidator,
        pluginEnableSignature
    }: KernelPluginManagerParams
): Promise<KernelPluginManager> {
    const chainId = await getChainId(client)
    return {
        ...validator,
        getEnableSignature: async (accountAddress: Address) => {
            if (!defaultValidator) return "0x"
            const executorData = validator.getExecutorData()
            if (!executorData.selector || !executorData.executor) {
                throw new Error("Invalid executor data")
            }
            let kernelImplAddr = KERNEL_ADDRESSES.ACCOUNT_V2_3_LOGIC
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
                    version: getKernelVersion(kernelImplAddr),
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
        getValidatorInitData: () => {
            if (!defaultValidator) throw new Error("No default validator")
            return {
                validatorAddress: defaultValidator.address,
                enableData: defaultValidator.getEnableData()
            }
        }
    }
}
