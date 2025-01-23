import type { Address, Client } from "viem"
import { getStorageAt } from "viem/actions"
import { getAction, getAddress, isHex, slice, toHex } from "viem/utils"
import { KERNEL_IMPLEMENTATION_SLOT } from "../../constants.js"

export type GetKernelImplementationAddressParams = {
    address: Address
}

/**
 * Returns the address of the kernel implementation.
 *
 * @param client {@link client} that you created using viem's createPublicClient.
 * @param args {@link GetKernelImplementationAddressParams} address
 * @returns Address
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
 * const kernelImplementationAddress = await getKernelImplementationAddress(client, {
 *      address,
 * })
 *
 * // Return 0x0000000000000000000000000000000000000000
 */
export const getKernelImplementationAddress = async (
    client: Client,
    args: GetKernelImplementationAddressParams
): Promise<Address> => {
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
        throw new Error("Kernel implementation address not found")
    }
    const addressSlice = slice(storageValue, 12)
    const addressHex = isHex(addressSlice) ? addressSlice : toHex(addressSlice)
    return getAddress(addressHex)
}
