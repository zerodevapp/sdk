import { privateKeyToAccount } from "viem/accounts"
import { getEntryPoint, getPublicClient, kernelVersion, index } from "./common"
import { createWeightedECDSAValidator } from "@zerodev/weighted-ecdsa-validator"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    createKernelAccount,
    type KernelSmartAccountImplementation
} from "@zerodev/sdk"
import type { SmartAccount } from "viem/account-abstraction"
import type { Hex } from "viem"

export const getSignersToWeightedEcdsaKernelAccount = async (): Promise<
    SmartAccount<KernelSmartAccountImplementation>
> => {
    const privateKey1 = process.env.TEST_PRIVATE_KEY as Hex
    const privateKey2 = process.env.TEST_PRIVATE_KEY2 as Hex
    if (!privateKey1 || !privateKey2) {
        throw new Error(
            "TEST_PRIVATE_KEY and TEST_PRIVATE_KEY2 environment variables must be set"
        )
    }
    const publicClient = await getPublicClient()
    const signer1 = privateKeyToAccount(privateKey1)
    const signer2 = privateKeyToAccount(privateKey2)
    const weightedECDSAPlugin = await createWeightedECDSAValidator(
        publicClient,
        {
            entryPoint: getEntryPoint(),
            kernelVersion,
            config: {
                threshold: 100,
                delay: 0,
                signers: [
                    { address: signer1.address, weight: 50 },
                    { address: signer2.address, weight: 50 }
                ]
            },
            signers: [signer1, signer2]
        }
    )

    const signer = privateKeyToAccount(privateKey1)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" },
        kernelVersion
    })

    return await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaValidatorPlugin,
            regular: weightedECDSAPlugin
        },
        index,
        kernelVersion
    })
}
