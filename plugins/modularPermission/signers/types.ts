import type { Address, Hex, LocalAccount } from "viem"

export type ModularSignerParams = {
    signerContractAddress?: Address
}

export type ModularSigner = {
    account: LocalAccount
    signerContractAddress: Address
    getSignerData: () => Hex
    getDummySignature: () => Hex
}
