import { satisfies } from "semver"
import {
    type Address,
    type Hex,
    type TypedDataDefinition,
    hashTypedData
} from "viem"
import { hashTypedData as hashTypedDataErc7739 } from "viem/experimental/erc7739"
import type { KERNEL_VERSION_TYPE } from "../../../../types/kernel.js"
import { eip712WrapHash } from "./eip712WrapHash"

export async function hashKernelTypedData({
    accountAddress,
    typedData,
    metadata,
    kernelVersion,
    useReplayableSignature
}: {
    accountAddress: Address
    typedData: TypedDataDefinition
    metadata: {
        name: string
        chainId: bigint
        version: string
        salt: Hex
    }
    kernelVersion: KERNEL_VERSION_TYPE
    useReplayableSignature?: boolean | undefined
}) {
    const { name, chainId: metadataChainId, version, salt } = metadata
    const chainId = useReplayableSignature ? 0 : Number(metadataChainId)

    // kernel v4 use erc7739 (https://eips.ethereum.org/EIPS/eip-7739)
    if (satisfies(kernelVersion, ">=0.4.0")) {
        return hashTypedDataErc7739({
            ...typedData,
            verifierDomain: {
                name,
                chainId,
                version,
                verifyingContract: accountAddress,
                salt
            }
        })
    }

    const typedHash = hashTypedData(typedData)
    const wrappedMessageHash = await eip712WrapHash(typedHash, {
        name,
        chainId,
        version,
        verifyingContract: accountAddress
    })
    return wrappedMessageHash
}
