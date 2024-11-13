import type { Address, Client } from "viem"
import { getCode } from "viem/actions"
import { getAction } from "viem/utils"

export const isSmartAccountDeployed = async (
    client: Client,
    address: Address
): Promise<boolean> => {
    const code = await getAction(
        client,
        getCode,
        "getCode"
    )({
        address
    })
    const deployed = Boolean(code)
    return deployed
}
