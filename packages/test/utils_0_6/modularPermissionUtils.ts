import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { createPermissionValidator } from "@zerodev/modular-permission"
import type { Policy } from "@zerodev/modular-permission/policies"
import { toECDSASigner } from "@zerodev/modular-permission/signers"
import type { KernelSmartAccountImplementation } from "@zerodev/sdk"
import { createKernelAccount } from "@zerodev/sdk"
import type { Hex } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { getEntryPoint, getPublicClient, index, kernelVersion } from "./common"

export const getSignerToModularPermissionKernelAccount = async (
    policies: Policy[]
): Promise<SmartAccount<KernelSmartAccountImplementation<"0.6">>> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const sessionPrivateKey = generatePrivateKey()
    const sessionKey = privateKeyToAccount(sessionPrivateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer,
        kernelVersion
    })

    const ecdsaModularSigner = toECDSASigner({ signer: sessionKey })
    const modularPermissionPlugin = await createPermissionValidator(
        publicClient,
        {
            entryPoint: getEntryPoint(),
            kernelVersion,
            signer: ecdsaModularSigner,
            policies
        }
    )

    return await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            regular: modularPermissionPlugin,
            sudo: ecdsaValidatorPlugin
        },
        index,
        kernelVersion
    })
}
