import { OAuthExtension } from "@magic-ext/oauth2"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import type {
    EntryPointType,
    GetKernelVersion,
    KernelValidator
} from "@zerodev/sdk/types"
import { Magic } from "magic-sdk"
import type { Client } from "viem"
import type { EntryPointVersion } from "viem/account-abstraction"

export async function isAuthorized({
    projectId
}: {
    projectId: string
}): Promise<boolean> {
    try {
        const magic = await getMagic({ projectId })

        const isLoggedIn = await magic.user.isLoggedIn()
        if (isLoggedIn) return true

        const result = await magic.oauth2.getRedirectResult()
        return result !== null
    } catch {}
    return false
}

export async function initiateLogin({
    socialProvider,
    oauthCallbackUrl,
    projectId
}: {
    socialProvider: "google" | "facebook"
    oauthCallbackUrl?: string
    projectId: string
}) {
    const magic = await getMagic({ projectId })

    magic.oauth2.loginWithRedirect({
        provider: socialProvider,
        redirectURI: oauthCallbackUrl ?? window.location.href
    })
}

export async function getSocialValidator<
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    {
        entryPoint,
        kernelVersion,
        projectId
    }: {
        entryPoint: EntryPointType<entryPointVersion>
        kernelVersion: GetKernelVersion<entryPointVersion>
        projectId: string
    }
): Promise<KernelValidator<"SocialValidator">> {
    const magic = await getMagic({ projectId })

    const authorized = await isAuthorized({ projectId })
    if (!authorized) {
        throw new Error("initiateLogin() must be called first.")
    }

    const magicProvider = magic.rpcProvider

    const ecdsaValidator = await signerToEcdsaValidator(client, {
        signer: magicProvider,
        entryPoint,
        kernelVersion
    })

    return {
        ...ecdsaValidator,
        source: "SocialValidator"
    }
}

export async function logout({ projectId }: { projectId: string }) {
    try {
        const magic = await getMagic({ projectId })
        await magic.user.logout()
    } catch (e) {}
}

async function getMagic({ projectId }: { projectId: string }) {
    const magicKey = await fetchMagicKey({ projectId })

    const magic =
        typeof window !== "undefined" &&
        new Magic(magicKey, {
            extensions: [new OAuthExtension()]
        })
    if (!magic) {
        throw new Error("Failed to initialize Magic SDK")
    }
    return magic
}

async function fetchMagicKey({ projectId }: { projectId: string }) {
    const serverUrl = "https://backend-vikp.onrender.com/v1/social/key"
    const response = await fetch(`${serverUrl}?projectId=${projectId}`)
    if (!response.ok) {
        throw new Error(
            `Failed to fetch Magic key: ${response.status} ${response.statusText}`
        )
    }
    const data = await response.json()
    return data.key
}
