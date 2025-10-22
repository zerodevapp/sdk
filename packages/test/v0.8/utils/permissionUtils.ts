import type { Policy } from "@zerodev/permissions"
import { toPermissionValidator } from "@zerodev/permissions"
import { toECDSASigner } from "@zerodev/permissions/signers"
import {
    type KernelSmartAccountImplementation,
    createKernelAccount
} from "@zerodev/sdk"
import type { SmartAccount } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
    defaultIndex,
    defaultKernelVersion,
    getEntryPoint,
    getPublicClient
} from "./common"

export const getSignerToRootPermissionKernelAccount = async (
    policies: Policy[]
): Promise<SmartAccount<KernelSmartAccountImplementation<"0.8">>> => {
    const publicClient = await getPublicClient()
    const signer1 = privateKeyToAccount(generatePrivateKey())
    const ecdsaModularSigner = await toECDSASigner({ signer: signer1 })

    const permissionPlugin = await toPermissionValidator(publicClient, {
        entryPoint: getEntryPoint(),
        kernelVersion: defaultKernelVersion,
        signer: ecdsaModularSigner,
        policies
    })

    return await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: permissionPlugin
        },
        index: defaultIndex,
        kernelVersion: defaultKernelVersion
    })
}
