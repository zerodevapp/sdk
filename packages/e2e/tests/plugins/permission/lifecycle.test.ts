import { expect, test } from "bun:test"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    deserializePermissionAccount,
    serializePermissionAccount,
    toInitConfig,
    toPermissionValidator
} from "@zerodev/permissions"
import { toSudoPolicy } from "@zerodev/permissions/policies"
import { toECDSASigner } from "@zerodev/permissions/signers"
import { createKernelAccount } from "@zerodev/sdk"
import { KERNEL_V3_3 } from "@zerodev/sdk/constants"
import { zeroAddress } from "viem"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    newOwner
} from "../../../harness/accounts"
import { getKernelClient, getPublicClient } from "../../../harness/clients"
import { forEachKernelVersion } from "../../../harness/matrix"
import {
    createSessionKeyAccount,
    sendCalls
} from "../../../harness/permissions"

const call = { to: zeroAddress }

forEachKernelVersion(KERNEL_V3_VERSIONS, (kernelVersion) => {
    test("enable mode on first use, regular mode afterwards", async () => {
        const { account } = await createSessionKeyAccount({
            kernelVersion,
            policies: [toSudoPolicy({})]
        })
        // Kernel keeps the validation mode in the nonce's top byte:
        // 0x01 enables the permission on first use, 0x00 uses it as installed.
        const client = getKernelClient(account, "sepolia")
        const mode = async () => {
            const { userOpHash, success } = await sendCalls(account, [call])
            expect(success).toBeTrue()
            const { userOperation } = await client.getUserOperation({
                hash: userOpHash
            })
            return userOperation.nonce >> 248n
        }
        expect(await mode()).toBe(1n)
        expect(await mode()).toBe(0n)
    })

    test("serialize with private key, deserialize, send", async () => {
        const { account, sessionPrivateKey } = await createSessionKeyAccount({
            kernelVersion,
            policies: [toSudoPolicy({})]
        })
        const serialized = await serializePermissionAccount(
            account,
            sessionPrivateKey
        )
        const restored = await deserializePermissionAccount(
            getPublicClient("sepolia"),
            ENTRY_POINT,
            kernelVersion,
            serialized
        )
        expect(restored.address).toBe(account.address)
        expect((await sendCalls(restored, [call])).success).toBeTrue()
    })

    test("approval flow: serialized without key, completed by the session key's signer", async () => {
        const { account, sessionKey } = await createSessionKeyAccount({
            kernelVersion,
            policies: [toSudoPolicy({})]
        })
        const approval = await serializePermissionAccount(account)
        const restored = await deserializePermissionAccount(
            getPublicClient("sepolia"),
            ENTRY_POINT,
            kernelVersion,
            approval,
            await toECDSASigner({ signer: sessionKey })
        )
        expect((await sendCalls(restored, [call])).success).toBeTrue()
    })
})

test("pre-installed permission via toInitConfig (kernel 0.3.3)", async () => {
    const publicClient = getPublicClient("sepolia")
    const owner = newOwner()
    const sessionKey = newOwner()
    const sudo = await signerToEcdsaValidator(publicClient, {
        signer: owner,
        entryPoint: ENTRY_POINT,
        kernelVersion: KERNEL_V3_3
    })
    const permissionPlugin = await toPermissionValidator(publicClient, {
        signer: await toECDSASigner({ signer: sessionKey }),
        policies: [toSudoPolicy({})],
        entryPoint: ENTRY_POINT,
        kernelVersion: KERNEL_V3_3
    })
    const sudoAccount = await createKernelAccount(publicClient, {
        entryPoint: ENTRY_POINT,
        kernelVersion: KERNEL_V3_3,
        plugins: { sudo },
        initConfig: await toInitConfig(permissionPlugin)
    })
    expect((await sendCalls(sudoAccount, [call])).success).toBeTrue()

    const sessionAccount = await createKernelAccount(publicClient, {
        entryPoint: ENTRY_POINT,
        kernelVersion: KERNEL_V3_3,
        plugins: { regular: permissionPlugin },
        address: sudoAccount.address
    })
    expect((await sendCalls(sessionAccount, [call])).success).toBeTrue()
})
