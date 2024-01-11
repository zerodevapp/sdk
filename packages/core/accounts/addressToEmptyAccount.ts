import type { Address, LocalAccount } from "viem"
import { toAccount } from "viem/accounts"

export type EmptyAccount = LocalAccount<"empty">
export function addressToEmptyAccount(address: Address): EmptyAccount {
    const account = toAccount({
        address,
        async signMessage() {
            throw new Error("Method not supported")
        },
        async signTransaction(_transaction) {
            throw new Error("Method not supported")
        },
        async signTypedData(_typedData) {
            throw new Error("Method not supported")
        }
    })

    return {
        ...account,
        publicKey: "0x",
        source: "empty"
    }
}
