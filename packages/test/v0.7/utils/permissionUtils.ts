import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { type Policy, toPermissionValidator } from "@zerodev/permissions"
import { toECDSASigner } from "@zerodev/permissions/signers"
import type { Action, KernelSmartAccountImplementation } from "@zerodev/sdk"
import { createKernelAccount } from "@zerodev/sdk"
import { type Hex, toFunctionSelector, zeroAddress } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import {
    type PrivateKeyAccount,
    generatePrivateKey,
    privateKeyToAccount
} from "viem/accounts"
import { getEntryPoint, getPublicClient, index, kernelVersion } from "./common"

export const getSignerToPermissionKernelAccount = async (
    policies: Policy[],
    action?: Action
): Promise<SmartAccount<KernelSmartAccountImplementation>> => {
    const privateKey1 = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey1) {
        throw new Error(
            "TEST_PRIVATE_KEY and TEST_PRIVATE_KEY2 environment variables must be set"
        )
    }
    const publicClient = await getPublicClient()
    const signer1 = privateKeyToAccount(generatePrivateKey())
    const ecdsaModularSigner = await toECDSASigner({ signer: signer1 })

    const permissionPlugin = await toPermissionValidator(publicClient, {
        entryPoint: getEntryPoint(),
        kernelVersion,
        signer: ecdsaModularSigner,
        policies
    })

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
            regular: permissionPlugin,
            action: action
        },
        index,
        kernelVersion
    })
}

export const getSessionKeySignerToPermissionKernelAccount = async (
    policies: Policy[],
    sessionKeySigner: PrivateKeyAccount
): Promise<SmartAccount<KernelSmartAccountImplementation>> => {
    const privateKey1 = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey1) {
        throw new Error(
            "TEST_PRIVATE_KEY and TEST_PRIVATE_KEY2 environment variables must be set"
        )
    }
    const publicClient = await getPublicClient()
    const ecdsaModularSigner = await toECDSASigner({ signer: sessionKeySigner })

    const permissionPlugin = await toPermissionValidator(publicClient, {
        entryPoint: getEntryPoint(),
        kernelVersion,
        signer: ecdsaModularSigner,
        policies
    })

    const rootSigner = privateKeyToAccount(privateKey1)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...rootSigner, source: "local" as "local" | "external" },
        kernelVersion
    })

    return await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaValidatorPlugin,
            regular: permissionPlugin
        },
        index,
        kernelVersion
    })
}

export const getSignerToRootPermissionKernelAccount = async (
    policies: Policy[]
): Promise<SmartAccount<KernelSmartAccountImplementation>> => {
    const publicClient = await getPublicClient()
    const signer1 = privateKeyToAccount(generatePrivateKey())
    const ecdsaModularSigner = await toECDSASigner({ signer: signer1 })

    const permissionPlugin = await toPermissionValidator(publicClient, {
        entryPoint: getEntryPoint(),
        kernelVersion,
        signer: ecdsaModularSigner,
        policies
    })

    return await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: permissionPlugin
        },
        index,
        kernelVersion
    })
}

export const getSignerToRootPermissionWithSecondaryValidatorKernelAccount =
    async (
        policies: Policy[]
    ): Promise<SmartAccount<KernelSmartAccountImplementation>> => {
        const publicClient = await getPublicClient()
        const signer1 = privateKeyToAccount(generatePrivateKey())
        const ecdsaModularSigner = await toECDSASigner({ signer: signer1 })

        const permissionPlugin = await toPermissionValidator(publicClient, {
            entryPoint: getEntryPoint(),
            kernelVersion,
            signer: ecdsaModularSigner,
            policies
        })

        const privateKey2 = generatePrivateKey()
        const signer2 = privateKeyToAccount(privateKey2)
        const ecdsaModularSigner2 = await toECDSASigner({ signer: signer2 })
        const permissionSessionKeyPlugin = await toPermissionValidator(
            publicClient,
            {
                entryPoint: getEntryPoint(),
                kernelVersion,
                signer: ecdsaModularSigner2,
                policies
            }
        )

        const account = await createKernelAccount(publicClient, {
            entryPoint: getEntryPoint(),
            plugins: {
                sudo: permissionPlugin,
                regular: permissionSessionKeyPlugin
            },
            index,
            kernelVersion
        })
        return account
    }

export const getSignerToPermissionKernelAccountAndPlugin = async (
    policies: Policy[]
) => {
    const publicClient = await getPublicClient()
    const signer1 = privateKeyToAccount(generatePrivateKey())

    const ecdsaPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: signer1,
        kernelVersion
    })

    const privateKey2 = generatePrivateKey()
    const signer2 = privateKeyToAccount(privateKey2)
    const ecdsaModularSigner2 = await toECDSASigner({ signer: signer2 })
    const permissionSessionKeyPlugin = await toPermissionValidator(
        publicClient,
        {
            entryPoint: getEntryPoint(),
            signer: ecdsaModularSigner2,
            policies,
            kernelVersion
        }
    )

    const accountWithSudoAndRegular = await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaPlugin,
            regular: permissionSessionKeyPlugin
        },
        index,
        kernelVersion
    })
    const accountWithSudo = await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaPlugin
        },
        index,
        kernelVersion
    })
    const accountWithRegular = await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            regular: permissionSessionKeyPlugin
        },
        address: accountWithSudo.address,
        kernelVersion
    })

    const privateKey3 = generatePrivateKey()
    const signer3 = privateKeyToAccount(privateKey3)
    const ecdsaModularSigner3 = await toECDSASigner({ signer: signer3 })
    const permissionSessionKeyPlugin2 = await toPermissionValidator(
        publicClient,
        {
            entryPoint: getEntryPoint(),
            signer: ecdsaModularSigner3,
            policies,
            kernelVersion
        }
    )
    const accountWithSudoAndRegular2 = await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            sudo: ecdsaPlugin,
            regular: permissionSessionKeyPlugin2
        },
        index,
        kernelVersion
    })
    return {
        accountWithSudoAndRegular,
        accountWithSudo,
        accountWithRegular,
        accountWithSudoAndRegular2,
        plugin: permissionSessionKeyPlugin
    }
}
