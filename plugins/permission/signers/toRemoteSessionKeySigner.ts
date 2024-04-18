import { constants, fixSignedData } from "@zerodev/sdk"
import type { TypedData } from "abitype"
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import {
    type Hex,
    type TypedDataDefinition,
    type SignableMessage,
    hashTypedData,
    type SignTypedDataParameters,
    getTypesForEIP712Domain,
    validateTypedData
} from "viem"
import { toAccount } from "viem/accounts"
import { ECDSA_SIGNER_CONTRACT } from "../constants.js"
import type { ModularSigner, ModularSignerParams } from "../types.js"
import axios from "axios"

export enum SessionKeySignerMode {
    Create = "create",
    Get = "get"
}

export type SessionKeyModularSignerParams = ModularSignerParams & {
    userName: string
    apiKey: string
    sessionKeyStorageUrl: string
    walletAddress?: Hex
    mode?: SessionKeySignerMode
}

export async function toRemoteSessionKeySigner({
    userName,
    apiKey,
    walletAddress,
    sessionKeyStorageUrl,
    mode = SessionKeySignerMode.Get,
    signerContractAddress = ECDSA_SIGNER_CONTRACT
}: SessionKeyModularSignerParams): Promise<ModularSigner> {
    if (mode === SessionKeySignerMode.Create) {
        try {
            const createTurnkeyWalletResult = await axios.post(
                `${sessionKeyStorageUrl}/key-pair`,
                {
                    userName
                },
                {
                    headers: {
                        "x-api-key": apiKey
                    }
                }
            )
            walletAddress = createTurnkeyWalletResult.data.walletAddress
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred"
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(
                    `Request failed with status code ${
                        error.response.status
                    }: ${error.response.data.message || errorMessage}`
                )
            } else {
                throw new Error(`An unexpected error occurred: ${errorMessage}`)
            }
        }
    }

    if (!walletAddress) {
        throw new Error("Wallet address should be provided on get mode")
    }

    const signMessageWithTurnkeyWallet = async (message: SignableMessage) => {
        try {
            const signMessageResult = await axios.post(
                `${sessionKeyStorageUrl}/sign-message`,
                {
                    walletAddress,
                    message
                },
                {
                    headers: {
                        "x-api-key": apiKey
                    }
                }
            )

            return signMessageResult.data.signature
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred"
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(
                    `Request failed with status code ${
                        error.response.status
                    }: ${error.response.data.message || errorMessage}`
                )
            } else {
                throw new Error(`An unexpected error occurred: ${errorMessage}`)
            }
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
