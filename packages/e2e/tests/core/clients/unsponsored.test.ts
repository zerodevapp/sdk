import { expect, test } from "bun:test"
import { parseEther, zeroAddress } from "viem"
import { entryPoint07Abi } from "viem/account-abstraction"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    createEcdsaAccount
} from "../../../harness/accounts"
import { setBalance } from "../../../harness/anvil"
import { getKernelClient, getPublicClient } from "../../../harness/clients"
import { forEachKernelVersion } from "../../../harness/matrix"

// A project without gas policies gets real fees from zd_getUserOperationGasPrice,
// so the account itself pays (meta-aa-provider bundlerController, UR branch).
const call = { to: zeroAddress, value: 0n, data: "0x" } as const

forEachKernelVersion(KERNEL_V3_VERSIONS, (kernelVersion) => {
    test("unsponsored project: an unfunded account is rejected with AA21", async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion
        })
        const client = getKernelClient(account, "sepolia", {
            project: "unsponsored"
        })
        await expect(
            client.sendUserOperation({ calls: [call] })
        ).rejects.toThrow(/AA21/)
    })

    test("unsponsored project: a funded account pays its own gas", async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion
        })
        const funding = parseEther("1")
        await setBalance("sepolia", account.address, funding)
        const client = getKernelClient(account, "sepolia", {
            project: "unsponsored"
        })
        const hash = await client.sendUserOperation({ calls: [call] })
        const receipt = await client.waitForUserOperationReceipt({ hash })
        expect(receipt.success).toBeTrue()
        expect(receipt.actualGasCost).toBeGreaterThan(0n)
        // EntryPoint 0.7 keeps the unused prefund as the account's deposit
        // instead of refunding it, so balance + deposit is what was not spent.
        const publicClient = getPublicClient("sepolia")
        const balance = await publicClient.getBalance({
            address: account.address
        })
        const deposit = await publicClient.readContract({
            address: ENTRY_POINT.address,
            abi: entryPoint07Abi,
            functionName: "balanceOf",
            args: [account.address]
        })
        expect(balance + deposit).toBe(funding - receipt.actualGasCost)
    })
})
