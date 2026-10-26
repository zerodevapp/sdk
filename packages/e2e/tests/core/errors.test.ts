import { describe, expect, test } from "bun:test"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { createKernelAccount } from "@zerodev/sdk"
import { type Hex, zeroAddress } from "viem"
import { formatUserOperationRequest } from "viem/account-abstraction"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    createEcdsaAccount,
    newOwner
} from "../../harness/accounts"
import { getKernelClient, getPublicClient } from "../../harness/clients"
import { rpcErrorDetails } from "../../harness/errors"
import { forEachKernelVersion } from "../../harness/matrix"
import { sendCalls } from "../../harness/permissions"

const call = { to: zeroAddress }

describe("configuration errors", () => {
    test("validator built for another kernel version is rejected", async () => {
        const publicClient = getPublicClient("sepolia")
        const sudo = await signerToEcdsaValidator(publicClient, {
            signer: newOwner(),
            entryPoint: ENTRY_POINT,
            kernelVersion: "0.3.1"
        })
        await expect(
            createKernelAccount(publicClient, {
                entryPoint: ENTRY_POINT,
                kernelVersion: "0.3.0",
                plugins: { sudo }
            })
        ).rejects.toThrow(/version mismatch/i)
    })

    for (const kernelVersion of ["0.3.0", "0.3.1", "0.3.2"] as const) {
        test(`EIP-7702 on kernel ${kernelVersion} is rejected`, async () => {
            await expect(
                createKernelAccount(getPublicClient("sepolia"), {
                    eip7702Account: newOwner(),
                    entryPoint: ENTRY_POINT,
                    kernelVersion
                })
            ).rejects.toThrow(
                /EIP-7702 is recommended for kernel version >=0.3.3/
            )
        })
    }
})

forEachKernelVersion(KERNEL_V3_VERSIONS, (kernelVersion) => {
    test("an op signed by a key that does not own the account is rejected", async () => {
        const { account: target } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion
        })
        expect((await sendCalls(target, [call])).success).toBeTrue()
        const publicClient = getPublicClient("sepolia")
        const intruder = await createKernelAccount(publicClient, {
            entryPoint: ENTRY_POINT,
            kernelVersion,
            address: target.address,
            plugins: {
                sudo: await signerToEcdsaValidator(publicClient, {
                    signer: newOwner(),
                    entryPoint: ENTRY_POINT,
                    kernelVersion
                })
            }
        })
        expect(await rpcErrorDetails(sendCalls(intruder, [call]))).toMatch(
            /AA24/
        )
    })

    test("a malformed signature is rejected", async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion
        })
        const client = getKernelClient(account, "sepolia")
        const op = await client.signUserOperation({
            calls: [{ ...call, value: 0n, data: "0x" }]
        })
        const garbage = "0x1234" as Hex
        const details = await rpcErrorDetails(
            client.request({
                method: "eth_sendUserOperation",
                params: [
                    formatUserOperationRequest({ ...op, signature: garbage }),
                    ENTRY_POINT.address
                ]
            } as never)
        )
        // InvalidSignature() from the validator
        expect(details).toMatch(/AA23 reverted 0x8baa579f/)
    })
})
