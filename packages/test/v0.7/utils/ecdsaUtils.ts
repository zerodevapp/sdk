import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    createKernelAccount,
    createKernelAccountClient,
    getUserOperationGasPrice
} from "@zerodev/sdk"
import { http, type Chain, type Hex, type Transport } from "viem"
import {
    type PaymasterActions,
    type SmartAccount,
    createBundlerClient
} from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
    getBundlerRpc,
    getEntryPoint,
    getPublicClient,
    getTestingChain,
    index,
    kernelVersion
} from "./common"

export const getEcdsaKernelAccountWithRandomSigner = async (
    initConfig?: Hex[],
    chain?: number,
    useReplayableSignature = false
) => {
    return getEcdsaKernelAccountWithPrivateKey(
        "0xdfbb0d855aafff58aa0ae92aa9d03e88562bad9befe209f5693db89b65cc4a9a" ??
            "0x3688628d97b817ee5e25dfce254ba4d87b5fd894449fce6c2acc60fdf98906de" ??
            generatePrivateKey(),
        initConfig,
        chain,
        useReplayableSignature
    )
}

const getEcdsaKernelAccountWithPrivateKey = async (
    privateKey: Hex,
    initConfig?: Hex[],
    chain?: number,
    useReplayableSignature = false
): Promise<SmartAccount<KernelSmartAccountImplementation<"0.7">>> => {
    if (!privateKey) {
        throw new Error("privateKey cannot be empty")
    }

    const publicClient = await getPublicClient(chain)
    const signer = privateKeyToAccount(privateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" },
        kernelVersion
    })

    return createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaValidatorPlugin
        },
        index,
        kernelVersion,
        initConfig,
        useReplayableSignature,
    })
}

export const getSignerToEcdsaKernelAccount = async () => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    return getEcdsaKernelAccountWithPrivateKey(privateKey)
}

export const getKernelAccountClient = async ({
    account,
    paymaster
}: {
    paymaster?: {
        /** Retrieves paymaster-related User Operation properties to be used for sending the User Operation. */
        getPaymasterData?: PaymasterActions["getPaymasterData"] | undefined
        /** Retrieves paymaster-related User Operation properties to be used for gas estimation. */
        getPaymasterStubData?:
            | PaymasterActions["getPaymasterStubData"]
            | undefined
    }
} & {
    account?: SmartAccount<KernelSmartAccountImplementation>
} = {}): Promise<
    KernelAccountClient<
        Transport,
        Chain,
        SmartAccount<KernelSmartAccountImplementation>
    >
> => {
    const chain = getTestingChain()
    const resolvedAccount = account ?? (await getSignerToEcdsaKernelAccount())

    const bundlerClient = createBundlerClient({
        transport: http(getBundlerRpc()),
        chain
    })

    return createKernelAccountClient({
        account: resolvedAccount,
        chain,
        bundlerTransport: http(getBundlerRpc(), { timeout: 100_000 }),
        paymaster,
        userOperation: {
            estimateFeesPerGas: async ({bundlerClient}) => {
                return getUserOperationGasPrice(bundlerClient)
            }
        }
    })
}
