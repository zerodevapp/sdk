import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    type KernelAccountClient,
    type KernelSmartAccountImplementation,
    createKernelAccount,
    createKernelAccountClient
} from "@zerodev/sdk"
import type { GetKernelVersion } from "@zerodev/sdk/types"
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
    _kernelVersion?: GetKernelVersion<"0.7">
) => {
    return getEcdsaKernelAccountWithPrivateKey(
        generatePrivateKey(),
        initConfig,
        chain,
        _kernelVersion
    )
}

export const getEcdsaKernelAccountWithPrivateKey = async (
    privateKey: Hex,
    initConfig?: Hex[],
    chain?: number,
    _kernelVersion?: GetKernelVersion<"0.7">
): Promise<SmartAccount<KernelSmartAccountImplementation<"0.7">>> => {
    if (!privateKey) {
        throw new Error("privateKey cannot be empty")
    }
    const kernelVersion_ = _kernelVersion ?? kernelVersion

    const publicClient = await getPublicClient(chain)
    const signer = privateKeyToAccount(privateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" },
        kernelVersion: kernelVersion_
    })

    return createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaValidatorPlugin
        },
        index,
        kernelVersion: kernelVersion_,
        initConfig
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
        paymaster
        // userOperation: {
        //     estimateFeesPerGas: async () => {
        //         return getUserOperationGasPrice(bundlerClient)
        //     }
        // }
    })
}
