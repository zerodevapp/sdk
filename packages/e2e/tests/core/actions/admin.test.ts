import { describe, expect, test } from "bun:test"
import {
    getValidatorAddress,
    signerToEcdsaValidator
} from "@zerodev/ecdsa-validator"
import { toPermissionValidator } from "@zerodev/permissions"
import { toSudoPolicy } from "@zerodev/permissions/policies"
import { toECDSASigner } from "@zerodev/permissions/signers"
import { createKernelAccount } from "@zerodev/sdk"
import { parseAbi, zeroAddress } from "viem"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    type KernelV3Version,
    createEcdsaAccount,
    newOwner
} from "../../../harness/accounts"
import { getKernelClient, getPublicClient } from "../../../harness/clients"
import { rpcErrorDetails } from "../../../harness/errors"
import { forEachKernelVersion } from "../../../harness/matrix"
import {
    createSessionKeyAccount,
    sendCalls
} from "../../../harness/permissions"

const call = { to: zeroAddress }

// Owner-only (sudo) view of an existing account.
async function sudoOnly(
    owner: ReturnType<typeof newOwner>,
    kernelVersion: KernelV3Version,
    address: `0x${string}`
) {
    const publicClient = getPublicClient("sepolia")
    const sudo = await signerToEcdsaValidator(publicClient, {
        signer: owner,
        entryPoint: ENTRY_POINT,
        kernelVersion
    })
    return createKernelAccount(publicClient, {
        entryPoint: ENTRY_POINT,
        kernelVersion,
        address,
        plugins: { sudo }
    })
}

forEachKernelVersion(KERNEL_V3_VERSIONS, (kernelVersion) => {
    describe("changeSudoValidator", () => {
        // On 0.3.0 the change reports success, but the new root's signatures
        // are rejected (InvalidSignature) and the old owner keeps working.
        const isV030 = kernelVersion === "0.3.0"
        test(isV030
            ? "ZER-1089 (current behaviour, 0.3.0): switching root to a permission validator reports success but the new key cannot sign and the old owner still can"
            : "switching root to a different validator (permission, sudo policy): new key sends, old owner is rejected", async () => {
            const { account, owner: ownerA } = await createEcdsaAccount({
                chain: "sepolia",
                kernelVersion
            })
            expect((await sendCalls(account, [call])).success).toBeTrue()

            const publicClient = getPublicClient("sepolia")
            const newRoot = await toPermissionValidator(publicClient, {
                signer: await toECDSASigner({ signer: newOwner() }),
                policies: [toSudoPolicy({})],
                entryPoint: ENTRY_POINT,
                kernelVersion
            })
            const client = getKernelClient(account, "sepolia")
            const hash = await client.changeSudoValidator({
                sudoValidator: newRoot
            })
            expect(
                (await client.waitForUserOperationReceipt({ hash })).success
            ).toBeTrue()

            const asNewRoot = await createKernelAccount(publicClient, {
                entryPoint: ENTRY_POINT,
                kernelVersion,
                address: account.address,
                plugins: { sudo: newRoot }
            })
            const asA = await sudoOnly(ownerA, kernelVersion, account.address)
            if (isV030) {
                expect(
                    await rpcErrorDetails(sendCalls(asNewRoot, [call]))
                ).toMatch(/AA23 reverted 0x8baa579f/)
                expect((await sendCalls(asA, [call])).success).toBeTrue()
            } else {
                expect((await sendCalls(asNewRoot, [call])).success).toBeTrue()
                expect(await rpcErrorDetails(sendCalls(asA, [call]))).toMatch(
                    /AA2[34]/
                )
            }
        })

        // Footgun, asserted as current behaviour: Kernel's changeRootValidator
        // only installs a validator that is not installed yet, so pointing root
        // at the already-installed ECDSA validator with a new owner keeps the old
        // owner's config. The SDK reports success instead of refusing.
        test("ZER-1088 (current behaviour): changing to the same ECDSA validator with a new owner keeps the old owner", async () => {
            const { account, owner: ownerA } = await createEcdsaAccount({
                chain: "sepolia",
                kernelVersion
            })
            expect((await sendCalls(account, [call])).success).toBeTrue()

            const publicClient = getPublicClient("sepolia")
            const ownerB = newOwner()
            const validatorB = await signerToEcdsaValidator(publicClient, {
                signer: ownerB,
                entryPoint: ENTRY_POINT,
                kernelVersion
            })
            const client = getKernelClient(account, "sepolia")
            const hash = await client.changeSudoValidator({
                sudoValidator: validatorB
            })
            expect(
                (await client.waitForUserOperationReceipt({ hash })).success
            ).toBeTrue()

            const storedOwner = await publicClient.readContract({
                address: getValidatorAddress(ENTRY_POINT, kernelVersion),
                abi: parseAbi([
                    "function ecdsaValidatorStorage(address) view returns (address)"
                ]),
                functionName: "ecdsaValidatorStorage",
                args: [account.address]
            })
            expect(storedOwner).toBe(ownerA.address)
            const asA = await sudoOnly(ownerA, kernelVersion, account.address)
            expect((await sendCalls(asA, [call])).success).toBeTrue()
            const asB = await sudoOnly(ownerB, kernelVersion, account.address)
            expect(await rpcErrorDetails(sendCalls(asB, [call]))).toMatch(
                /AA24/
            )
        })
    })

    describe("uninstallPlugin", () => {
        test("uninstalled session key is rejected, owner still works", async () => {
            const { account, owner, permissionPlugin } =
                await createSessionKeyAccount({
                    kernelVersion,
                    policies: [toSudoPolicy({})]
                })
            expect((await sendCalls(account, [call])).success).toBeTrue()

            const owned = await sudoOnly(owner, kernelVersion, account.address)
            const client = getKernelClient(owned, "sepolia")
            const hash = await client.uninstallPlugin({
                plugin: permissionPlugin
            })
            expect(
                (await client.waitForUserOperationReceipt({ hash })).success
            ).toBeTrue()

            await expect(sendCalls(account, [call])).rejects.toThrow(/AA2[34]/)
            expect((await sendCalls(owned, [call])).success).toBeTrue()
        })
    })

    describe("invalidateNonce", () => {
        test("invalidating the nonce (ERC-7677 paymaster) disables an enabled session key", async () => {
            const { account, owner } = await createSessionKeyAccount({
                kernelVersion,
                policies: [toSudoPolicy({})]
            })
            expect((await sendCalls(account, [call])).success).toBeTrue()

            const owned = await sudoOnly(owner, kernelVersion, account.address)
            const client = getKernelClient(owned, "sepolia", {
                paymaster: "erc7677"
            })
            const current = await client.getKernelV3ModuleCurrentNonce()
            const hash = await client.invalidateNonce({
                nonceToSet: current + 1
            })
            expect(
                (await client.waitForUserOperationReceipt({ hash })).success
            ).toBeTrue()
            expect(await client.getKernelV3ModuleCurrentNonce()).toBe(
                current + 1
            )
            await expect(sendCalls(account, [call])).rejects.toThrow(/AA23/)
        })

        // Known bug, asserted as current behaviour (same leak as upgradeKernel).
        test("ZER-1087 (current behaviour): via sponsorUserOperation the op is rejected for the leaked nonceToSet key", async () => {
            const { account } = await createEcdsaAccount({
                chain: "sepolia",
                kernelVersion
            })
            expect((await sendCalls(account, [call])).success).toBeTrue()
            const client = getKernelClient(account, "sepolia")
            const current = await client.getKernelV3ModuleCurrentNonce()
            expect(
                await rpcErrorDetails(
                    client.invalidateNonce({ nonceToSet: current + 1 })
                )
            ).toMatch(/Unrecognized key\(s\) in object: 'nonceToSet'/)
        })
    })
})
