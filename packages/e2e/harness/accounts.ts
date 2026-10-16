import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { createKernelAccount } from "@zerodev/sdk"
import {
    KERNEL_V3_0,
    KERNEL_V3_1,
    KERNEL_V3_2,
    KERNEL_V3_3,
    getEntryPoint
} from "@zerodev/sdk/constants"
import {
    type PrivateKeyAccount,
    generatePrivateKey,
    privateKeyToAccount
} from "viem/accounts"
import { type KernelAccount, getPublicClient } from "./clients"
import type { ChainKey } from "./env"

export const ENTRY_POINT = getEntryPoint("0.7")

export const KERNEL_V3_VERSIONS = [
    KERNEL_V3_0,
    KERNEL_V3_1,
    KERNEL_V3_2,
    KERNEL_V3_3
] as const

export type KernelV3Version = (typeof KERNEL_V3_VERSIONS)[number]

// Mirrors KERNEL_FEATURES.ERC1271_REPLAYABLE (">=0.3.2") in packages/core/utils.ts.
export const supportsReplayable = (v: KernelV3Version) =>
    v === KERNEL_V3_2 || v === KERNEL_V3_3

export const randomIndex = () => BigInt(Math.floor(Math.random() * 2 ** 48))

export const newOwner = () => privateKeyToAccount(generatePrivateKey())

export async function createEcdsaAccount({
    chain,
    kernelVersion,
    owner = newOwner(),
    index = randomIndex(),
    useMetaFactory
}: {
    chain: ChainKey
    kernelVersion: KernelV3Version
    owner?: PrivateKeyAccount
    index?: bigint
    useMetaFactory?: boolean
}): Promise<{
    account: KernelAccount
    owner: PrivateKeyAccount
    index: bigint
}> {
    const publicClient = getPublicClient(chain)
    const sudo = await signerToEcdsaValidator(publicClient, {
        signer: owner,
        entryPoint: ENTRY_POINT,
        kernelVersion
    })
    const account = await createKernelAccount(publicClient, {
        entryPoint: ENTRY_POINT,
        kernelVersion,
        index,
        useMetaFactory,
        plugins: { sudo }
    })
    return { account, owner, index }
}
