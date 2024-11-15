import { constants, fixSignedData, toSigner } from "@zerodev/sdk"
import type { Signer } from "@zerodev/sdk/types"
import type { TypedData } from "abitype"
import type { TypedDataDefinition } from "viem"
import { toAccount } from "viem/accounts"
import { ECDSA_SIGNER_CONTRACT } from "../constants.js"
import type { ModularSigner, ModularSignerParams } from "../types.js"

export type ECDSAModularSignerParams = ModularSignerParams & {
    signer: Signer
}

export async function toECDSASigner({
    signer,
    signerContractAddress = ECDSA_SIGNER_CONTRACT
}: ECDSAModularSignerParams): Promise<ModularSigner> {
    const viemSigner = await toSigner({ signer })
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
        account,
        signerContractAddress,
        getSignerData: () => {
            return viemSigner.address
        },
        getDummySignature: () => constants.DUMMY_ECDSA_SIG
    }
}
