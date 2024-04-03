import { getAction } from "permissionless"
import type { Address, Client } from "viem"
import { readContract } from "viem/actions"
import { KernelV3AccountAbi } from "../../../abi/kernel_v_3_0_0/KernelAccountAbi.js"

export const getKernelV3Nonce = async (
    client: Client,
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
