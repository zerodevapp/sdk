import { createEcdsaKernelAccountClient } from "@kerneljs/presets/zerodev"
import { Hex, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { polygonMumbai } from "viem/chains"

const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex)

const kernelClient = await createEcdsaKernelAccountClient({
    // required
    chain: polygonMumbai,
    projectId: process.env.ZERODEV_PROJECT_ID || "",
    signer,

    // optional
    provider: "STACKUP",
    index: BigInt(1)
})

console.log("My account:", kernelClient.account.address)

const txnHash = await kernelClient.sendTransaction({
    to: zeroAddress,
    value: 0n,
    data: "0x"
})

console.log("txn hash:", txnHash)

const userOpHash = await kernelClient.sendUserOperation({
    userOperation: {
        callData: await kernelClient.account.encodeCallData({
            to: zeroAddress,
            value: 0n,
            data: "0x"
        })
    }
})

console.log("userOp hash:", userOpHash)
