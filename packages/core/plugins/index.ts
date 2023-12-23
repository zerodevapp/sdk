import { signerToEcdsaValidator } from "./toECDSAValidatorPlugin"
import { type KernelPlugin } from "./types"
import { type Address } from "viem"

export { signerToEcdsaValidator, type KernelPlugin }

export const KERNEL_ADDRESSES: {
    ECDSA_VALIDATOR: Address
    ACCOUNT_V2_3_LOGIC: Address
    FACTORY_ADDRESS: Address
} = {
    ECDSA_VALIDATOR: "0xd9AB5096a832b9ce79914329DAEE236f8Eea0390",
    ACCOUNT_V2_3_LOGIC: "0xD3F582F6B4814E989Ee8E96bc3175320B5A540ab",
    FACTORY_ADDRESS: "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3"
}
