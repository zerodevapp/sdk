import { EIP1271Abi, verifyEIP6492Signature } from "@zerodev/sdk"
import type { Address, Hex } from "viem"
import { getPublicClient } from "./clients"
import type { ChainKey } from "./env"

const ERC1271_MAGIC = "0x1626ba7e"

export function isValid6492(
    key: ChainKey,
    signer: Address,
    hash: Hex,
    signature: Hex
): Promise<boolean> {
    return verifyEIP6492Signature({
        signer,
        hash,
        signature,
        client: getPublicClient(key)
    })
}

export async function isValid1271(
    key: ChainKey,
    account: Address,
    hash: Hex,
    signature: Hex,
    caller?: Address
): Promise<boolean> {
    const result = await getPublicClient(key)
        .readContract({
            address: account,
            abi: EIP1271Abi,
            functionName: "isValidSignature",
            args: [hash, signature],
            account: caller
        })
        .catch(() => "0x")
    return result === ERC1271_MAGIC
}

export async function isDeployed(key: ChainKey, address: Address) {
    const code = await getPublicClient(key).getCode({ address })
    return code !== undefined && code !== "0x"
}
