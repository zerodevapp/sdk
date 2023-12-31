import {
    createKernelAccount,
    createKernelPaymasterClient
} from "@kerneljs/core"
import { signerToEcdsaValidator } from "@kerneljs/ecdsa-validator"
import { UserOperation, createSmartAccountClient } from "permissionless"
import { http, Hex, createPublicClient, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { polygonMumbai } from "viem/chains"

const publicClient = createPublicClient({
    transport: http(process.env.BUNDLER_RPC)
})

const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex)

const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer
})

const account = await createKernelAccount(publicClient, {
    plugin: ecdsaValidator
})

const kernelClient = createSmartAccountClient({
    account,
    chain: polygonMumbai,
    transport: http(process.env.BUNDLER_RPC),
    sponsorUserOperation: async ({ userOperation }): Promise<UserOperation> => {
        const kernelPaymaster = createKernelPaymasterClient({
            chain: polygonMumbai,
            transport: http(process.env.PAYMASTER_RPC)
        })
        return kernelPaymaster.sponsorUserOperation({
            userOperation
        })
    }
})

const txnHash = await kernelClient.sendTransaction({
    to: zeroAddress,
    value: 0n,
    data: "0x"
})

console.log("txn hash:", txnHash)

const userOpHash = await kernelClient.sendUserOperation({
    userOperation: {
        callData: await account.encodeCallData({
            to: zeroAddress,
            value: 0n,
            data: "0x"
        })
    }
})

console.log("userOp hash:", userOpHash)
