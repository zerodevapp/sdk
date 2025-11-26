import type { KernelAccountClient } from "@zerodev/sdk"
import { type Address, zeroAddress } from "viem"
import { publicClient } from "./config"

export async function createAccountIfNotDeployed(
    kernelClient: KernelAccountClient
) {
    const deployed = await publicClient.getCode({
        address: kernelClient.account?.address as Address
    })

    if (!deployed || deployed === "0x") {
        console.log("deploying kernel account...")
        const userOpHash = await kernelClient.sendUserOperation({
            calls: [
                {
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                }
            ]
        })
        await kernelClient.waitForUserOperationReceipt({
            hash: userOpHash
        })
    }
}
