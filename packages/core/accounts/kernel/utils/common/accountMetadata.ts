import {
    type Address,
    type Client,
    decodeFunctionResult,
    encodeFunctionData,
    publicActions
} from "viem"
import { KERNEL_NAME } from "../../../../constants.js"
import type { KERNEL_VERSION_TYPE } from "../../../../types/kernel.js"
import { EIP1271Abi } from "../../abi/EIP1271Abi.js"

export type AccountMetadata = {
    name: string
    version: string
    chainId: bigint
}
export const accountMetadata = async (
    client: Client,
    accountAddress: Address,
    kernelVersion: KERNEL_VERSION_TYPE,
    chainId?: number
): Promise<AccountMetadata> => {
    try {
        const domain = await client.request({
            method: "eth_call",
            params: [
                {
                    to: accountAddress,
                    data: encodeFunctionData({
                        abi: EIP1271Abi,
                        functionName: "eip712Domain"
                    })
                },
                "latest"
            ]
        })
        if (domain !== "0x") {
            const decoded = decodeFunctionResult({
                abi: [...EIP1271Abi],
                functionName: "eip712Domain",
                data: domain
            })
            return {
                name: decoded[1],
                version: decoded[2],
                chainId: decoded[3]
            }
        }
    } catch (error) {}
    return {
        name: KERNEL_NAME,
        version: kernelVersion === "0.3.0" ? "0.3.0-beta" : kernelVersion,
        chainId: BigInt(
            chainId ??
                (client.chain
                    ? client.chain.id
                    : await client.extend(publicActions).getChainId())
        )
    }
}
