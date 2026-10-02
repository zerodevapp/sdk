import { expect, test } from "bun:test"
import { type Hex, zeroAddress } from "viem"
import { formatUserOperationRequest } from "viem/account-abstraction"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    createEcdsaAccount
} from "../../../harness/accounts"
import { type KernelAccount, getKernelClient } from "../../../harness/clients"
import { forEachKernelVersion } from "../../../harness/matrix"

const call = { to: zeroAddress, value: 0n, data: "0x" } as const

// signUserOperation prepares and signs; submit the raw op so nothing
// re-prepares (and re-sponsors) it.
async function signedOp(account: KernelAccount) {
    const client = getKernelClient(account, "sepolia")
    const op = await client.signUserOperation({ calls: [call] })
    const submit = (signature: Hex) =>
        client.request({
            method: "eth_sendUserOperation",
            params: [
                formatUserOperationRequest({ ...op, signature }),
                ENTRY_POINT.address
            ]
        } as never) as Promise<Hex>
    return { client, signature: op.signature, submit }
}

forEachKernelVersion(KERNEL_V3_VERSIONS, (kernelVersion) => {
    test("signUserOperation output is accepted when submitted raw", async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion
        })
        const { client, signature, submit } = await signedOp(account)
        const hash = await submit(signature)
        expect(
            (await client.waitForUserOperationReceipt({ hash })).success
        ).toBeTrue()
    })

    test("a tampered signature is rejected", async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion
        })
        const { signature, submit } = await signedOp(account)
        // Flip a byte inside the ECDSA r value (last 65 bytes are r,s,v).
        const i = signature.length - 130
        const flipped = (Number.parseInt(signature.slice(i, i + 2), 16) ^ 0xff)
            .toString(16)
            .padStart(2, "0")
        const tampered =
            `${signature.slice(0, i)}${flipped}${signature.slice(i + 2)}` as Hex
        await expect(submit(tampered)).rejects.toThrow(/AA2[34]|signature/i)
    })
})
