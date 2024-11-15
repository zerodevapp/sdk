import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { type Policy, toPermissionValidator } from "@zerodev/permissions"
import { toECDSASigner } from "@zerodev/permissions/signers"
import {
    type KernelSmartAccountImplementation,
    createKernelAccount
} from "@zerodev/sdk"
import type { LocalAccount } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { getEntryPoint, getPublicClient, index, kernelVersion } from "./common"

export const getEcdsaKernelAccountWithRemoteSigner = async (
    remoteSigner: LocalAccount
) => {
    const publicClient = await getPublicClient()
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: remoteSigner,
        kernelVersion
    })

    return createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaValidatorPlugin
        },
        index,
        kernelVersion
    })
}

export const getPermissionKernelAccountWithRemoteSigner = async (
    remoteSigner: LocalAccount,
    policies: Policy[]
): Promise<SmartAccount<KernelSmartAccountImplementation>> => {
    const publicClient = await getPublicClient()
    const ecdsaSigner = await toECDSASigner({ signer: remoteSigner })
    const permissionPlugin = await toPermissionValidator(publicClient, {
        entryPoint: getEntryPoint(),
        kernelVersion,
        signer: ecdsaSigner,
        policies
    })

    return createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: permissionPlugin
        },
        index,
        kernelVersion
    })
}
