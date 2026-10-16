import { type Hex, isErc6492Signature, serializeErc6492Signature } from "viem"
import type { EntryPointVersion, SmartAccount } from "viem/account-abstraction"
import { KERNEL_FEATURES, hasKernelFeature } from "../../utils.js"
import type { KernelSmartAccountImplementation } from "../kernel/createKernelAccount.js"

/**
 * Wraps a replayable signature with ERC-6492 so it also verifies on chains
 * where the account is not deployed yet.
 *
 * `account.signMessage({ message, useReplayableSignature: true })` follows
 * viem and only adds the ERC-6492 wrapper while the account is undeployed on
 * the signing chain. Pass its result here when the signature will be verified
 * on other chains too.
 *
 * Returns the signature unchanged when it is already wrapped, for EIP-7702
 * accounts (nothing to deploy) and for Kernel versions without replayable
 * signatures (<0.3.2).
 *
 * The other chain deploys the account from its factory data, so it must match
 * the account that signed (same Kernel version and root validator). Verifiers
 * must support ERC-6492; a contract that calls `isValidSignature` directly
 * needs the unwrapped signature.
 *
 * @example
 * const signature = await toReplayableErc6492Signature(
 *     account,
 *     await account.signMessage({ message, useReplayableSignature: true })
 * )
 */
export async function toReplayableErc6492Signature<
    entryPointVersion extends EntryPointVersion
>(
    account: SmartAccount<KernelSmartAccountImplementation<entryPointVersion>>,
    signature: Hex
): Promise<Hex> {
    if (
        isErc6492Signature(signature) ||
        !account.factoryAddress ||
        !hasKernelFeature(
            KERNEL_FEATURES.ERC1271_REPLAYABLE,
            account.kernelVersion
        )
    ) {
        return signature
    }
    return serializeErc6492Signature({
        address: account.factoryAddress,
        data: await account.generateInitCode(),
        signature
    })
}
