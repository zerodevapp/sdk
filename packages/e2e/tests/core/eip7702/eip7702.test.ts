import { expect, test } from "bun:test"
import { createKernelAccount } from "@zerodev/sdk"
import {
    KERNEL_7702_DELEGATION_ADDRESS,
    KERNEL_V3_3
} from "@zerodev/sdk/constants"
import { hashMessage, zeroAddress } from "viem"
import { ENTRY_POINT, newOwner } from "../../../harness/accounts"
import { getKernelClient, getPublicClient } from "../../../harness/clients"
import { isValid1271 } from "../../../harness/verify"

test("EOA delegates to Kernel via 7702, sends a sponsored op and signs", async () => {
    const eoa = newOwner()
    const publicClient = getPublicClient("sepolia")
    const account = await createKernelAccount(publicClient, {
        eip7702Account: eoa,
        entryPoint: ENTRY_POINT,
        kernelVersion: KERNEL_V3_3
    })
    expect(account.address).toBe(eoa.address)

    const client = getKernelClient(account, "sepolia")
    const hash = await client.sendUserOperation({
        calls: [{ to: zeroAddress, value: 0n, data: "0x" }]
    })
    expect(
        (await client.waitForUserOperationReceipt({ hash })).success
    ).toBeTrue()

    const code = await publicClient.getCode({ address: eoa.address })
    expect(code?.toLowerCase()).toBe(
        `0xef0100${KERNEL_7702_DELEGATION_ADDRESS.slice(2)}`.toLowerCase()
    )

    const message = "zerodev e2e 7702"
    const signature = await account.signMessage({ message })
    expect(
        await isValid1271(
            "sepolia",
            eoa.address,
            hashMessage(message),
            signature
        )
    ).toBeTrue()
})
