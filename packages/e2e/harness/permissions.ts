import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { type Policy, toPermissionValidator } from "@zerodev/permissions"
import { toECDSASigner } from "@zerodev/permissions/signers"
import { createKernelAccount } from "@zerodev/sdk"
import type { Address, Hex } from "viem"
import {
    type PrivateKeyAccount,
    generatePrivateKey,
    privateKeyToAccount
} from "viem/accounts"
import {
    ENTRY_POINT,
    type KernelV3Version,
    newOwner,
    randomIndex
} from "./accounts"
import { type KernelAccount, getKernelClient, getPublicClient } from "./clients"
import type { ChainKey } from "./env"

export async function createSessionKeyAccount({
    chain = "sepolia",
    kernelVersion,
    policies,
    owner = newOwner(),
    sessionPrivateKey = generatePrivateKey(),
    index = randomIndex()
}: {
    chain?: ChainKey
    kernelVersion: KernelV3Version
    policies: Policy[]
    owner?: PrivateKeyAccount
    sessionPrivateKey?: Hex
    index?: bigint
}) {
    // The private key is returned so tests can serialize the session key.
    const sessionKey = privateKeyToAccount(sessionPrivateKey)
    const publicClient = getPublicClient(chain)
    const sudo = await signerToEcdsaValidator(publicClient, {
        signer: owner,
        entryPoint: ENTRY_POINT,
        kernelVersion
    })
    const permissionPlugin = await toPermissionValidator(publicClient, {
        signer: await toECDSASigner({ signer: sessionKey }),
        policies,
        entryPoint: ENTRY_POINT,
        kernelVersion
    })
    const account: KernelAccount = await createKernelAccount(publicClient, {
        entryPoint: ENTRY_POINT,
        kernelVersion,
        index,
        plugins: { sudo, regular: permissionPlugin }
    })
    return {
        account,
        owner,
        sessionKey,
        sessionPrivateKey,
        permissionPlugin,
        index
    }
}

export async function sendCalls(
    account: KernelAccount,
    calls: { to: Address; value?: bigint; data?: Hex }[],
    chain: ChainKey = "sepolia"
) {
    const client = getKernelClient(account, chain)
    const hash = await client.sendUserOperation({
        calls: calls.map((c) => ({ value: 0n, data: "0x" as Hex, ...c }))
    })
    return client.waitForUserOperationReceipt({ hash })
}
