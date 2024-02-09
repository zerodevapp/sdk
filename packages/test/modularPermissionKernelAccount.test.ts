import { beforeAll, describe, expect, test } from "bun:test"
import { http, PublicClient, createPublicClient, zeroAddress } from "viem"
import { polygonMumbai } from "viem/chains"
import {
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getSignerToModularPermissionKernelAccount,
    getZeroDevPaymasterClient
} from "./utils"

const TEST_TIMEOUT = 1000000

describe("Modular Permission kernel Account", async () => {
    let publicClient: PublicClient

    beforeAll(async () => {
        publicClient = await getPublicClient()
    })

    test(
        "should send a tx",
        async () => {
            const modularPermissionSmartAccountClient =
                await getKernelAccountClient({
                    account: await getSignerToModularPermissionKernelAccount(),
                    sponsorUserOperation: async ({ userOperation }) => {
                        const kernelPaymaster = getZeroDevPaymasterClient()
                        const entryPoint = getEntryPoint()
                        return kernelPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint
                        })
                    }
                })

            const txHash =
                await modularPermissionSmartAccountClient.sendTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            console.log("txHash", `https://mumbai.polygonscan.com/tx/${txHash}`)
        },
        TEST_TIMEOUT
    )
})
