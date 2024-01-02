import { createEcdsaKernelAccountClient } from "@kerneljs/presets/zerodev"
import { Hex, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { polygonMumbai } from "viem/chains"

if (!process.env.ZERODEV_PROJECT_ID) {
    throw new Error("ZERODEV_PROJECT_ID is not set")
}

const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex)

const kernelClient = await createEcdsaKernelAccountClient({
    // required
    chain: polygonMumbai,
    projectId: process.env.ZERODEV_PROJECT_ID,
    signer,

    // optional
    provider: "STACKUP", // defaults to a recommended provider
    index: BigInt(1), // defaults to 0
    usePaymaster: true // defaults to true
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
