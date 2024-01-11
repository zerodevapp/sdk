import { beforeAll, describe, expect, test } from "bun:test"
import { KernelAccountClient, KernelSmartAccount } from "@kerneljs/core"
import { type SessionKeyPlugin } from "@kerneljs/session-key"
import { SmartAccountClient } from "permissionless"
import { SmartAccount } from "permissionless/accounts"
import {
    http,
    Address,
    Chain,
    type Client,
    Hex,
    PrivateKeyAccount,
    PublicClient,
    Transport,
    createClient,
    createPublicClient,
    encodeFunctionData,
    getFunctionSelector,
    zeroAddress
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { polygonMumbai } from "viem/chains"
import { TEST_ERC20Abi } from "./abis/Test_ERC20Abi"
import {
    getEntryPoint,
    getKernelAccountClient,
    getPimlicoPaymasterClient,
    getPublicClient,
    getSignerToEcdsaKernelAccount,
    getSignerToSessionKeyKernelAccount,
    getZeroDevPaymasterClient
} from "./utils"

describe("Session Key kernel Account", async () => {
    let publicClient: PublicClient
    const client = await createPublicClient({
        chain: polygonMumbai,
        transport: http(process.env.RPC_URL as string)
    })
    let sessionKeyValidatorPlugin: SessionKeyPlugin
    let testPrivateKey: Hex
    let owner: PrivateKeyAccount
    let accountAddress: Address
    let Test_ERC20Address: Address
    let ecdsaSmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        KernelSmartAccount
    >
    let sessionKeySmartAccountClient: KernelAccountClient<
        Transport,
        Chain,
        KernelSmartAccount
    >

    beforeAll(async () => {
        Test_ERC20Address = "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B"
        publicClient = await getPublicClient()
        testPrivateKey = process.env.TEST_PRIVATE_KEY as Hex
        owner = privateKeyToAccount(testPrivateKey)

        sessionKeySmartAccountClient = await getKernelAccountClient({
            account: await getSignerToSessionKeyKernelAccount(),
            sponsorUserOperation: async ({ userOperation }) => {
                const kernelPaymaster = getZeroDevPaymasterClient()
                const entryPoint = getEntryPoint()
                return kernelPaymaster.sponsorUserOperation({
                    userOperation,
                    entryPoint
                })
            }
        })
        accountAddress = (await sessionKeySmartAccountClient.account
            ?.address) as Address

        ecdsaSmartAccountClient = await getKernelAccountClient({
            account: await getSignerToEcdsaKernelAccount(),
            sponsorUserOperation: async ({ userOperation }) => {
                const kernelPaymaster = getZeroDevPaymasterClient()
                const entryPoint = getEntryPoint()
                return kernelPaymaster.sponsorUserOperation({
                    userOperation,
                    entryPoint
                })
            }
        })
    })

    test("should execute the erc20 token transfer action using SessionKey", async () => {
        console.log("accountAddress", accountAddress)
        const balanceBefore = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [accountAddress]
        })

        const amountToMint = balanceBefore > 100000000n ? 0n : 100000000n

        const mintData = encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "mint",
            args: [accountAddress, amountToMint]
        })

        if (amountToMint > 0n) {
            const mintTransactionHash =
                await ecdsaSmartAccountClient.sendTransaction({
                    to: Test_ERC20Address,
                    data: mintData
                })
            console.log(
                "mintTransactionHash",
                `https://mumbai.polygonscan.com/tx/${mintTransactionHash}`
            )
        }

        const amountToTransfer = 100000000n
        const transferData = encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [owner.address, amountToTransfer]
        })

        const balanceOfReceipientBefore = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [owner.address]
        })
        const transferTransactionHash =
            await sessionKeySmartAccountClient.sendTransaction({
                to: Test_ERC20Address,
                data: transferData
            })

        console.log(
            "transferTransactionHash",
            `https://mumbai.polygonscan.com/tx/${transferTransactionHash}`
        )
        const balanceOfReceipientAfter = await client.readContract({
            abi: TEST_ERC20Abi,
            address: Test_ERC20Address,
            functionName: "balanceOf",
            args: [owner.address]
        })
        expect(balanceOfReceipientAfter).toBe(
            balanceOfReceipientBefore + amountToTransfer
        )
    }, 1000000)
})
