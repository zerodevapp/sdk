import {
    type Hex,
    type TypedDataDomain,
    concatHex,
    domainSeparator,
    keccak256
} from "viem"
import type { WithRequired } from "../../../../types/index.js"
import { KERNEL_FEATURES, hasKernelFeature } from "../../../../utils.js"
import { hashKernelMessageHashWrapper } from "../ep0_7/hashKernelSignatureWrapper.js"

export const eip712WrapHash = async (
    messageHash: Hex,
    domain: WithRequired<
        TypedDataDomain,
        "name" | "chainId" | "verifyingContract" | "version"
    >
): Promise<Hex> => {
    const { name, version, chainId, verifyingContract } = domain

    if (!hasKernelFeature(KERNEL_FEATURES.ERC1271_SIG_WRAPPER, version)) {
        return messageHash
    }

    const _domainSeparator = domainSeparator({
        domain: {
            name,
            version,
            chainId,
            verifyingContract
        }
    })

    let finalMessageHash = messageHash
    if (
        hasKernelFeature(
            KERNEL_FEATURES.ERC1271_SIG_WRAPPER_WITH_WRAPPED_HASH,
            version
        )
    ) {
        finalMessageHash = hashKernelMessageHashWrapper(finalMessageHash)
    }

    const digest = keccak256(
        concatHex(["0x1901", _domainSeparator, finalMessageHash])
    )
    return digest
}
