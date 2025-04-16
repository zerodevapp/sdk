import "dotenv/config"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { createKernelAccountClient } from "@zerodev/sdk"
import { createZeroDevPaymasterClient } from "@zerodev/sdk"
import { createKernelAccount } from "@zerodev/sdk/accounts"
import { getUserOperationGasPrice } from "@zerodev/sdk/actions"
import {
    KERNEL_7702_DELEGATION_ADDRESS,
    KERNEL_V3_1,
    getEntryPoint
} from "@zerodev/sdk/constants"
import {
    http,
    type Hex,
    createPublicClient,
    createWalletClient,
    zeroAddress
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { getCode } from "viem/actions"
import { odysseyTestnet } from "viem/chains"
import { eip7702Actions } from "viem/experimental"

const projectId = process.env.PROJECT_ID
const bundlerRpc = `https://rpc.zerodev.app/api/v2/bundler/${projectId}`
const paymasterRpc = `https://rpc.zerodev.app/api/v2/paymaster/${projectId}`
const entryPoint = getEntryPoint("0.7")
const kernelVersion = KERNEL_V3_1
const publicClient = createPublicClient({
    transport: http(bundlerRpc),
    chain: odysseyTestnet
})
const privateKey = generatePrivateKey() ?? (process.env.PRIVATE_KEY as Hex)

const main = async () => {
    if (!privateKey) {
        throw new Error("PRIVATE_KEY is required")
    }

    const signer = privateKeyToAccount(privateKey)
    console.log("EOA Address:", signer.address)
    
    const walletClient = createWalletClient({
        // Use any Viem-compatible EOA account
        account: signer,

        // We use the Odyssey testnet here, but you can use any network that
        // supports EIP-7702.
        chain: odysseyTestnet,
        transport: http()
    }).extend(eip7702Actions())
    console.log("ZZ")
    const authorization = await walletClient.signAuthorization({
        contractAddress: KERNEL_7702_DELEGATION_ADDRESS,
        sponsor: true
    })
    console.log("AA-11")
    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer,
        entryPoint,
        kernelVersion
    })
    console.log("BB")
    const account = await createKernelAccount(publicClient, {
        plugins: {
            sudo: ecdsaValidator
        },
        entryPoint,
        kernelVersion,
        // Set the address of the smart account to the EOA address
        address: signer.address,
        // Set the 7702 authorization
        //eip7702Auth: authorization
    })
    console.log("AA");

    const paymasterClient = createZeroDevPaymasterClient({
        chain: odysseyTestnet,
        transport: http(paymasterRpc)
    })

    console.log("BB");
    const kernelClient = createKernelAccountClient({
        account,
        chain: odysseyTestnet,
        bundlerTransport: http(bundlerRpc),
        paymaster: paymasterClient,
        client: publicClient,
        userOperation: {
            estimateFeesPerGas: async ({ bundlerClient }) => {
                return getUserOperationGasPrice(bundlerClient)
            }
        }
    })
    console.log("CC");
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
        ]),
        eip7702Auth: authorization
    })
    console.log("DD");
    const { receipt } = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash
    })
    console.log(
        "UserOp completed",
        `https://explorer-odyssey.t.conduit.xyz/tx/${receipt.transactionHash}`
    )
}

main().finally(() => {
    process.exit(0)
})
