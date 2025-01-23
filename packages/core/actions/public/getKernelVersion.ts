import { type Address, type Client, zeroAddress } from "viem"
import { getStorageAt } from "viem/actions"
import {
    getAction,
    getAddress,
    isAddressEqual,
    isHex,
    slice,
    toHex
} from "viem/utils"
import {
    KERNEL_IMPLEMENTATION_SLOT,
    KernelVersionToAddressesMap
} from "../../constants.js"
import type { KERNEL_VERSION_TYPE } from "../../types/index.js"

export type GetKernelVersionParams = {
    address: Address
}

/**
 * Returns the address of the kernel implementation.
 *
 * @param client {@link client} that you created using viem's createPublicClient.
 * @param args {@link GetKernelVersionParams} address
 * @returns KERNEL_VERSION_TYPE
 *
 * @example
 * import { createPublicClient } from "viem"
 * import { getKernelImplementationAddress } from "@zerodev/sdk/actions"
 *
 * const client = createPublicClient({
 *      chain: goerli,
 *      transport: http("https://goerli.infura.io/v3/your-infura-key")
 * })
 *
 * const kernelVersion = await getKernelVersion(client, {
 *      address,
 * })
 *
 * // Return "0.3.1"
 */
export const getKernelVersion = async (
    client: Client,
    args: GetKernelVersionParams
): Promise<KERNEL_VERSION_TYPE | null> => {
    const { address } = args

    const storageValue = await getAction(
        client,
        getStorageAt,
        "getStorageAt"
    )({
        address,
        slot: KERNEL_IMPLEMENTATION_SLOT
    })
    if (!storageValue) {
        throw new Error("Kernel version not found")
    }
    const addressSlice = slice(storageValue, 12)
    const addressHex = isHex(addressSlice) ? addressSlice : toHex(addressSlice)
    const kernelImplementationAddress = getAddress(addressHex)
    if (isAddressEqual(kernelImplementationAddress, zeroAddress)) {
        return null
    }
    const kernelVersion = Object.keys(KernelVersionToAddressesMap).find(
        (version) =>
            isAddressEqual(
                KernelVersionToAddressesMap[version as KERNEL_VERSION_TYPE]
                    .accountImplementationAddress,
                kernelImplementationAddress
            )
    )
    if (!kernelVersion) {
        return null
    }
    return kernelVersion as KERNEL_VERSION_TYPE
}
