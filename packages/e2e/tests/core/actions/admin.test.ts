import { describe, expect, test } from "bun:test"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { toSudoPolicy } from "@zerodev/permissions/policies"
import { createKernelAccount } from "@zerodev/sdk"
import { zeroAddress } from "viem"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    type KernelV3Version,
    createEcdsaAccount,
    newOwner
} from "../../../harness/accounts"
import { getKernelClient, getPublicClient } from "../../../harness/clients"
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
        // Changing to the same ECDSA validator contract with a new owner reports
        // success but keeps the old owner (stored owner unchanged; A still signs).
        test.failing(
            "NEW BUG (changeSudoValidator to the same ECDSA validator keeps the old owner): new owner can send, old owner is rejected",
            async () => {
                const { account, owner: ownerA } = await createEcdsaAccount({
                    chain: "sepolia",
                    kernelVersion
                })
                expect((await sendCalls(account, [call])).success).toBeTrue()

                const ownerB = newOwner()
                const validatorB = await signerToEcdsaValidator(
                    getPublicClient("sepolia"),
                    { signer: ownerB, entryPoint: ENTRY_POINT, kernelVersion }
                )
                const client = getKernelClient(account, "sepolia")
                const hash = await client.changeSudoValidator({
                    sudoValidator: validatorB
                })
                expect(
                    (await client.waitForUserOperationReceipt({ hash })).success
                ).toBeTrue()

                const asB = await sudoOnly(
                    ownerB,
                    kernelVersion,
                    account.address
                )
                expect((await sendCalls(asB, [call])).success).toBeTrue()
                const asA = await sudoOnly(
                    ownerA,
                    kernelVersion,
                    account.address
                )
                await expect(sendCalls(asA, [call])).rejects.toThrow(/AA2[34]/)
            }
        )
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
        test("getKernelV3ModuleCurrentNonce reads the nonce", async () => {
            const { account } = await createEcdsaAccount({
                chain: "sepolia",
                kernelVersion
            })
            expect((await sendCalls(account, [call])).success).toBeTrue()
            const client = getKernelClient(account, "sepolia")
            expect(
                await client.getKernelV3ModuleCurrentNonce()
            ).toBeGreaterThanOrEqual(0)
        })

        // invalidateNonce spreads its args into sendUserOperation, so
        // `nonceToSet` lands in the userOp and Ultra Relay's schema rejects it.
        test.failing(
            "NEW BUG (invalidateNonce leaks nonceToSet into the userOp): invalidating the nonce disables an enabled session key",
            async () => {
                const { account, owner } = await createSessionKeyAccount({
                    kernelVersion,
                    policies: [toSudoPolicy({})]
                })
                expect((await sendCalls(account, [call])).success).toBeTrue()

                const owned = await sudoOnly(
                    owner,
                    kernelVersion,
                    account.address
                )
                const client = getKernelClient(owned, "sepolia")
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
            }
        )
    })
})
