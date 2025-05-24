import "dotenv/config"
import {
    type ModularSigner,
    deserializePermissionAccount,
    serializePermissionAccount,
    toPermissionValidator
} from "@zerodev/permissions"
import { toSudoPolicy } from "@zerodev/permissions/policies"
import { toECDSASigner } from "@zerodev/permissions/signers"
import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { KERNEL_V3_3, getEntryPoint } from "@zerodev/sdk/constants"
import { http, type Hex, createPublicClient, zeroAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"

const chain = sepolia
const projectId = process.env.ZERODEV_PROJECT_ID
const ZERODEV_RPC = `https://rpc.zerodev.app/api/v3/${projectId}/chain/${chain.id}`
const publicClient = createPublicClient({
    chain,
    transport: http(ZERODEV_RPC)
})

const privateKey = generatePrivateKey()
const signer = privateKeyToAccount(privateKey)

const entryPoint = getEntryPoint("0.7")
const kernelVersion = KERNEL_V3_3

const createSessionKey = async (
    sessionKeySigner: ModularSigner,
    sessionPrivateKey: Hex
) => {
    const masterAccount = await createKernelAccount(publicClient, {
        entryPoint,
        eip7702Account: signer,
        kernelVersion
    })
    console.log("Account address:", masterAccount.address)

    const permissionPlugin = await toPermissionValidator(publicClient, {
        entryPoint,
        signer: sessionKeySigner,
        policies: [
            // In this example, we are just using a sudo policy to allow everything.
            // In practice, you would want to set more restrictive policies.
            toSudoPolicy({})
        ],
        kernelVersion
    })

    const sessionKeyAccount = await createKernelAccount(publicClient, {
        entryPoint,
        eip7702Account: signer,
        plugins: {
            regular: permissionPlugin
        },
        kernelVersion
    })
    console.log("1.Session key account address:", sessionKeyAccount.address)

    // Include the private key when you serialize the session key
    return await serializePermissionAccount(
        sessionKeyAccount,
        sessionPrivateKey
    )
}

const useSessionKey = async (serializedSessionKey: string) => {
    const sessionKeyAccount = await deserializePermissionAccount(
        publicClient,
        entryPoint,
        KERNEL_V3_3,
        serializedSessionKey
    )
    console.log("2. Session key account address:", sessionKeyAccount.address)

    const kernelPaymaster = createZeroDevPaymasterClient({
        chain,
        transport: http(ZERODEV_RPC)
    })
    const kernelClient = createKernelAccountClient({
        account: sessionKeyAccount,
        chain,
        bundlerTransport: http(ZERODEV_RPC),
        paymaster: kernelPaymaster
    })

    const userOpHash = await kernelClient.sendUserOperation({
        callData: await sessionKeyAccount.encodeCalls([
            {
                to: zeroAddress,
                value: BigInt(0),
                data: "0x"
            }
        ])
    })
    console.log("userOp hash:", userOpHash)

    const { receipt } = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash
    })
    console.log(
        "UserOp completed",
        `${chain.blockExplorers.default.url}/tx/${receipt.transactionHash}`
    )
}

const main = async () => {
    // await createAndDeploy7702KernelAccount();
    const sessionPrivateKey = generatePrivateKey()
    const sessionKeyAccount = privateKeyToAccount(sessionPrivateKey)
    const sessionKeySigner = await toECDSASigner({
        signer: sessionKeyAccount
    })

    // The owner creates a session key, serializes it, and shares it with the agent.
    const serializedSessionKey = await createSessionKey(
        sessionKeySigner,
        sessionPrivateKey
    )

    // The agent reconstructs the session key using the serialized value
    await useSessionKey(serializedSessionKey)
}

main().then(() => {
    console.log("Done")
    process.exit(0)
})
