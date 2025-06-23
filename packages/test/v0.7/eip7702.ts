import "dotenv/config"
import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient} from "@zerodev/sdk"
import { KernelAccountV2Abi } from "@zerodev/sdk/accounts"
import { getUserOperationGasPrice } from "@zerodev/sdk/actions"
import { KERNEL_V3_3, getEntryPoint } from "@zerodev/sdk/constants"
import {
    http,
    type Hex,
    createPublicClient,
    getContract,
    hashMessage,
    hashTypedData,
    zeroAddress
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"

const entryPoint = getEntryPoint("0.7")
const kernelVersion = KERNEL_V3_3

// We use the Sepolia testnet here, but you can use any network that
// supports EIP-7702.
const chain = sepolia
const projectId = process.env.ZERODEV_PROJECT_ID
const ZERODEV_RPC = `https://rpc.zerodev.app/api/v3/${projectId}/chain/${chain.id}`

const publicClient = createPublicClient({
    transport: http(),
    chain
})

const main = async () => {
    const eip7702Account = privateKeyToAccount(
        generatePrivateKey() ?? (process.env.PRIVATE_KEY as Hex)
    )
    console.log("EOA Address:", eip7702Account.address)

    const account = await createKernelAccount(publicClient, {
        eip7702Account,
        entryPoint,
        kernelVersion
    })
    console.log("account", account.address)

    const paymasterClient = createZeroDevPaymasterClient({
        chain,
        transport: http(ZERODEV_RPC)
    })

    const kernelClient = createKernelAccountClient({
        account,
        chain,
        bundlerTransport: http(ZERODEV_RPC),
        paymaster: {
            getPaymasterData: async (userOperation) => {
                return paymasterClient.sponsorUserOperation({ userOperation })
            }
        },
        client: publicClient,
        userOperation: {
            estimateFeesPerGas: async ({ bundlerClient }) => {
                return getUserOperationGasPrice(bundlerClient)
            }
        }
    })

    const userOpHash = await kernelClient.sendUserOperation({
        callData: await kernelClient.account.encodeCalls([
            {
                to: zeroAddress,
                value: BigInt(0),
                data: "0x"
            },
            {
                to: zeroAddress,
                value: BigInt(0),
                data: "0x"
            }
        ])
    })
    console.log("UserOp sent:", userOpHash)
    console.log("Waiting for UserOp to be completed...")

    const { receipt } = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash
    })
    console.log(
        "UserOp completed",
        `${chain.blockExplorers.default.url}/tx/${receipt.transactionHash}`
    )

    const signature = await account.signMessage({
        message: "hello world"
    })
    console.log("hash", hashMessage("hello world"))
    console.log("signature", signature)

    const contract = getContract({
        abi: KernelAccountV2Abi,
        address: account.address,
        client: publicClient
    })
    const isValid = await contract.read.isValidSignature([
        hashMessage("hello world"),
        signature
    ])
    console.log("isValid", isValid)

    const domain = {
        chainId: 1,
        name: "Test",
        verifyingContract: zeroAddress
    }

    const primaryType = "Test"

    const types = {
        Test: [
            {
                name: "test",
                type: "string"
            }
        ]
    }

    const message = {
        test: "hello world"
    }
    const typedHash = hashTypedData({
        domain,
        primaryType,
        types,
        message
    })

    const signature2 = await account.signTypedData({
        message,
        primaryType,
        types,
        domain
    })

    console.log("signature2", signature2)

    const isValid2 = await contract.read.isValidSignature([
        typedHash,
        signature2
    ])
    console.log("isValid2", isValid2)

    process.exit(0)
}

main()
