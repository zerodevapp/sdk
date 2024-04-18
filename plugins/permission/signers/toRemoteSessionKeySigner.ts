import { constants, fixSignedData } from "@zerodev/sdk"
import type { TypedData } from "abitype"
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import {
    type Hex,
    type SignTypedDataParameters,
    type SignableMessage,
    type TypedDataDefinition,
    getTypesForEIP712Domain,
    hashTypedData,
    validateTypedData
} from "viem"
import { toAccount } from "viem/accounts"
import { ECDSA_SIGNER_CONTRACT } from "../constants.js"
import type { ModularSigner, ModularSignerParams } from "../types.js"

export enum SessionKeySignerMode {
    Create = "create",
    Get = "get"
}

export type SessionKeyModularSignerParams = ModularSignerParams & {
    apiKey: string
    sessionKeyStorageUrl?: string
    walletAddress?: Hex
    mode?: SessionKeySignerMode
}

export async function toRemoteSessionKeySigner({
    apiKey,
    walletAddress,
    sessionKeyStorageUrl = "https://keys.zerodev.app/wallet/v1",
    mode = SessionKeySignerMode.Get,
    signerContractAddress = ECDSA_SIGNER_CONTRACT
}: SessionKeyModularSignerParams): Promise<ModularSigner> {
    if (mode === SessionKeySignerMode.Create) {
        try {
            const response = await fetch(`${sessionKeyStorageUrl}/key-pair`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey
                }
            })

            if (!response.ok) {
                const errorBody = await response.json()
                throw new Error(
                    `Request failed with status code ${response.status}: ${errorBody.message}`
                )
            }

            const createTurnkeyWalletResult = await response.json()
            walletAddress = createTurnkeyWalletResult.walletAddress
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred"
            throw new Error(`An unexpected error occurred: ${errorMessage}`)
        }
    }

    if (!walletAddress) {
        throw new Error("Wallet address should be provided on get mode")
    }

    const signMessageWithTurnkeyWallet = async (message: SignableMessage) => {
        try {
            const response = await fetch(
                `${sessionKeyStorageUrl}/sign-message`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": apiKey
                    },
                    body: JSON.stringify({
                        walletAddress,
                        message
                    })
                }
            )

            if (!response.ok) {
                const errorBody = await response.json()
                throw new Error(
                    `Request failed with status code ${response.status}: ${
                        errorBody.message || "An unknown error occurred"
                    }`
                )
            }

            const signMessageResult = await response.json()
            return signMessageResult.signature
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred"
            throw new Error(`An unexpected error occurred: ${errorMessage}`)
        }
    }

    const account = toAccount({
        address: walletAddress,
        async signMessage({ message }) {
            return fixSignedData(await signMessageWithTurnkeyWallet(message))
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount()
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            const { domain, message, primaryType } =
                typedData as unknown as SignTypedDataParameters

            const types = {
                EIP712Domain: getTypesForEIP712Domain({ domain }),
                ...typedData.types
            }

            validateTypedData({ domain, message, primaryType, types })

            const hash = hashTypedData(typedData)
            return fixSignedData(await signMessageWithTurnkeyWallet(hash))
        }
    })
    return {
        account,
        signerContractAddress,
        getSignerData: () => {
            if (!walletAddress) {
                throw new Error("Wallet address not found")
            }
            return walletAddress
        },
        getDummySignature: () => constants.DUMMY_ECDSA_SIG
    }
}
