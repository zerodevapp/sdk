// Copied from: https://github.com/pimlicolabs/permissionless.js/blob/main/packages/permissionless/utils/toOwner.ts
import {
    type Account,
    type Address,
    type Chain,
    type EIP1193Provider,
    type EIP1193RequestFn,
    type EIP1474Methods,
    type LocalAccount,
    type Transport,
    type TypedData,
    type TypedDataDefinition,
    type WalletClient,
    createWalletClient,
    custom
} from "viem"
import { toAccount } from "viem/accounts"

import { signAuthorization, signMessage, signTypedData } from "viem/actions"
import type { Signer } from "../types/index.js"

export async function toSigner({
    signer,
    address
}: {
    signer: Signer
    address?: Address
}): Promise<LocalAccount> {
    if ("type" in signer && signer.type === "local") {
        return signer as LocalAccount
    }

    let walletClient:
        | WalletClient<Transport, Chain | undefined, Account>
        | undefined = undefined

    if ("request" in signer) {
        if (!address) {
            address = (
                await Promise.any([
                    (signer.request as EIP1193RequestFn<EIP1474Methods>)({
                        method: "eth_requestAccounts"
                    }),
                    (signer.request as EIP1193RequestFn<EIP1474Methods>)({
                        method: "eth_accounts"
                    })
                ])
            )[0]
        }
        if (!address) {
            // For TS to be happy
            throw new Error("address is required")
        }
        walletClient = createWalletClient({
            account: address,
            transport: custom(signer as EIP1193Provider)
        })
    }

    if (!walletClient) {
        walletClient = signer as WalletClient<
            Transport,
            Chain | undefined,
            Account
        >
    }

    return toAccount({
        address: walletClient.account.address,
        async signMessage({ message }) {
            return signMessage(
                walletClient as WalletClient<
                    Transport,
                    Chain | undefined,
                    Account
                >,
                { message }
            )
        },
        async signTypedData(typedData) {
            const { primaryType, domain, message, types } =
                typedData as TypedDataDefinition<TypedData, string>
            return signTypedData(
                walletClient as WalletClient<
                    Transport,
                    Chain | undefined,
                    Account
                >,
                {
                    primaryType,
                    domain,
                    message,
                    types
                }
            )
        },
        async signTransaction(_) {
            throw new Error(
                "Smart account signer doesn't need to sign transactions"
            )
        },
        async signAuthorization(authorization) {
            return signAuthorization(
                walletClient as WalletClient<
                    Transport,
                    Chain | undefined,
                    Account
                >,
                authorization
            )
        }
    }) as LocalAccount
}
