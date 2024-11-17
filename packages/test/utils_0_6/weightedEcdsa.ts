import {
    type KernelSmartAccountImplementation,
    type KernelValidator,
    createKernelAccount
} from "@zerodev/sdk"
import { createWeightedECDSAValidator } from "@zerodev/weighted-ecdsa-validator"
import type { Hex } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { privateKeyToAccount } from "viem/accounts"
import { getEntryPoint, getPublicClient, index, kernelVersion } from "./common"

export const getSignersToWeightedEcdsaKernelAccount = async (
    plugin?: KernelValidator
): Promise<SmartAccount<KernelSmartAccountImplementation<"0.6">>> => {
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
    const weigthedECDSAPlugin = await createWeightedECDSAValidator(
        publicClient,
        {
            kernelVersion,
            entryPoint: getEntryPoint(),
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

    if (plugin) {
        return await createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            plugins: {
                regular: plugin,
                sudo: weigthedECDSAPlugin
            },
            index,
            kernelVersion
        })
    } else {
        return await createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            plugins: {
                sudo: weigthedECDSAPlugin
            },
            index,
            kernelVersion
        })
    }
}
