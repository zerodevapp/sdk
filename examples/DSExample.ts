import {
    Bytes4,
    enableDoubleEcdsaValidator,
    signerToDoubleEcdsaValidator
} from "@zerodev/double-ecdsa-validator"
import {
    KernelAccountClient,
    KernelSmartAccount,
    createKernelAccount,
    createKernelAccountClient
} from "@zerodev/sdk"
import * as dotenv from "dotenv"
import { utils } from "ethers"
import { bundlerActions } from "permissionless"
import {
    http,
    type Chain,
    type HttpTransport,
    createPublicClient,
    encodeFunctionData
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import { simpleLendingAbi } from "./abi/simpleLendingAbi"

dotenv.config()

const main = async () => {
    const getZeroDevBundlerRPC = (projectId: string): string => {
        const rpc = `https://rpc.zerodev.app/api/v2/bundler/${projectId}`
        return rpc
    }

    const privateKey = generatePrivateKey()
    const signer = privateKeyToAccount(privateKey)
    const chain = sepolia
    // .env breaking
    // const projectId = process.env.ZERODEV_PROJECT_ID as string;
    const projectId = "ccf05920-669e-4635-adf5-618d322389da"

    const publicClient = createPublicClient({
        transport: http(getZeroDevBundlerRPC(projectId)),
        chain
    })

    const proofHash =
        "0x5f35dce98ba4fba25530a026ed80b2cecdaa31091ba4958b99b52ea1d068adad"
    // TODO: What if the proofId is the hash of the proof + a nonce?
    const proofId = utils.defaultAbiCoder.encode(["uint256"], [158])

    const psValidator = await signerToDoubleEcdsaValidator(
        publicClient,
        {
            signer
        },
        proofHash
    )

    const account = await createKernelAccount(publicClient, {
        plugins: {
            sudo: psValidator
        }
    })

    const model_id: Bytes4 = "0x00010002" as Bytes4
    const version_id: Bytes4 = "0x00010003" as Bytes4

    const kernelClient = createKernelAccountClient({
        account,
        chain,
        transport: http(getZeroDevBundlerRPC(projectId))
    })

    // Enable the ProofSigValidator
    // Warning: We may need gas sponsorship
    enableDoubleEcdsaValidator(
        account,
        model_id,
        version_id,
        proofId,
        proofHash,
        kernelClient as KernelAccountClient<
            HttpTransport,
            Chain,
            KernelSmartAccount
        >
    )
    console.log("Kernel Client: ", kernelClient)

    const data = encodeFunctionData({
        abi: simpleLendingAbi,
        functionName: "getAddress",
        args: []
    })

    const calldata = await kernelClient.account.encodeCallData({
        // This is the address of the deployed SimpleLending contract
        to: "0xB0b1eDf7dB33eF70f432395353ec70eb7c55Ab61",
        value: 0n,
        data
    })

    const UOcalldata = proofId + calldata.slice(2)

    const userOpHash = await kernelClient.sendUserOperation({
        userOperation: {
            callData: UOcalldata as `0x${string}`
        }
    })

    const bundlerClient = kernelClient.extend(bundlerActions)

    const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash
    })

    console.log("receipt: ", receipt)
}

if (require.main === module) {
    main()
}
