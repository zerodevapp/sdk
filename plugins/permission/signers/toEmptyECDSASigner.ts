import { constants } from "@zerodev/sdk"
import type { TypedData } from "abitype"
import type { Address, TypedDataDefinition } from "viem"
import { toAccount } from "viem/accounts"
import { ECDSA_SIGNER_CONTRACT } from "../constants.js"
import type { ModularSigner } from "../types.js"

export function toEmptyECDSASigner(
    address: Address,
    signerContractAddress: Address = ECDSA_SIGNER_CONTRACT
): ModularSigner {
    const account = toAccount({
        address,
        async signMessage() {
            throw new Error("Method not supported")
        },
        async signTransaction(_, __) {
            throw new Error("Method not supported")
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(_typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            throw new Error("Method not supported")
        }
    })
    return {
        account,
        signerContractAddress: signerContractAddress,
        getSignerData: () => {
            return address
        },
        getDummySignature: () => constants.DUMMY_ECDSA_SIG
    }
}
