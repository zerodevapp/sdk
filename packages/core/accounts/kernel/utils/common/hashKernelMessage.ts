import { satisfies } from "semver"
import { type Address, type SignableMessage, hashMessage } from "viem"
import { hashMessage as hashMessageErc7739 } from "viem/experimental/erc7739"
import type { KERNEL_VERSION_TYPE } from "../../../../types/kernel.js"
import { eip712WrapHash } from "./eip712WrapHash"

export async function hashKernelMessage({
    accountAddress,
    message,
    metadata,
    kernelVersion,
    useReplayableSignature
}: {
    accountAddress: Address
    message: SignableMessage
    metadata: {
        name: string
        chainId: bigint
        version: string
    }
    kernelVersion: KERNEL_VERSION_TYPE
    useReplayableSignature: boolean | undefined
}) {
    const { name, chainId: metadataChainId, version } = metadata
    const chainId = useReplayableSignature ? 0 : Number(metadataChainId)

    // kernel v4 use erc7739 (https://eips.ethereum.org/EIPS/eip-7739)
    if (satisfies(kernelVersion, ">=0.4.0")) {
        return hashMessageErc7739({
            message,
            verifierDomain: {
                name,
                chainId,
                version,
                verifyingContract: accountAddress
            }
        })
    }

    // kernel v3 and before use wrap message hash with eip712
    const messageHash = hashMessage(message)
    const wrappedMessageHash = await eip712WrapHash(
        messageHash,
        {
            name,
            chainId,
            version,
            verifyingContract: accountAddress
        },
        useReplayableSignature
    )

    return wrappedMessageHash
}
