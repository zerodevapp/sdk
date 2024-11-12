import { constants, fixSignedData } from "@zerodev/sdk"
import type { TypedData } from "abitype"
import type { LocalAccount, TypedDataDefinition } from "viem"
import { toAccount } from "viem/accounts"
import { SIGNER_TYPE } from "../constants.js"
import type { WeightedSigner } from "../toMultiChainWeightedValidatorPlugin.js"

export type ECDSASignerParams = {
    signer: LocalAccount
}

export function toECDSASigner({ signer }: ECDSASignerParams): WeightedSigner {
    const viemSigner: LocalAccount = {
        ...signer,
        signTransaction: (_, __) => {
            throw new Error(
                "Smart account signer doesn't need to sign transactions"
            )
        }
    } as LocalAccount
    const account = toAccount({
        address: viemSigner.address,
        async signMessage({ message }) {
            return fixSignedData(await viemSigner.signMessage({ message }))
        },
        async signTransaction(_, __) {
            throw new Error(
                "Smart account signer doesn't need to sign transactions"
            )
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return fixSignedData(
                await viemSigner.signTypedData<TTypedData, TPrimaryType>({
                    ...typedData
                })
            )
        }
    })
    return {
        type: SIGNER_TYPE.ECDSA,
        getPublicKey: () => account.address,
        account,
        getDummySignature: () => constants.DUMMY_ECDSA_SIG
    }
}
