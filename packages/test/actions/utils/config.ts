import {
    KERNEL_V2_2,
    KERNEL_V2_3,
    KERNEL_V2_4,
    KERNEL_V3_0,
    KERNEL_V3_1,
    KERNEL_V3_2,
    KERNEL_V3_3
} from "@zerodev/sdk/constants"
import type { KERNEL_VERSION_TYPE } from "@zerodev/sdk/types"
import { http, type Address, type Hex, createPublicClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"

export type VALIDATOR_TYPE =
    | "ECDSA"
    | "WEIGHTED_ECDSA"
    | "WEIGHTED_R1_K1"
    | "MULTI_CHAIN_ECDSA"
    | "MULTI_CHAIN_WEIGHTED"

export const chain = sepolia

export const RPC_URL = process.env.RPC_URL_SEPOLIA as string

export const publicClient = createPublicClient({
    chain: chain,
    transport: http(RPC_URL)
})

export const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY as Hex
export const ZERODEV_RPC = `${process.env.ZERODEV_RPC}/${chain.id}`

export const signer = privateKeyToAccount(PRIVATE_KEY)

export const TEST_TIMEOUT = 1000000

export const config: Partial<
    Record<KERNEL_VERSION_TYPE, Partial<Record<VALIDATOR_TYPE, Address[]>>>
> = {
    [KERNEL_V2_2]: {
        ECDSA: ["0xd9AB5096a832b9ce79914329DAEE236f8Eea0390"]
        // "WEIGHTED_ECDSA": ["0x8012D9ee59176Cb01a4aa80fCFE6f5E8bA58d4fb"]
    },
    [KERNEL_V2_3]: {
        ECDSA: ["0xd9AB5096a832b9ce79914329DAEE236f8Eea0390"]
        // "WEIGHTED_ECDSA": ["0x8012D9ee59176Cb01a4aa80fCFE6f5E8bA58d4fb"]
    },
    [KERNEL_V2_4]: {
        ECDSA: ["0xd9AB5096a832b9ce79914329DAEE236f8Eea0390"]
        // "WEIGHTED_ECDSA": ["0x8012D9ee59176Cb01a4aa80fCFE6f5E8bA58d4fb"]
    },
    [KERNEL_V3_0]: {
        ECDSA: ["0x8104e3Ad430EA6d354d013A6789fDFc71E671c43"],
        WEIGHTED_ECDSA: ["0xeD89244160CfE273800B58b1B534031699dFeEEE"],
        // "WEIGHTED_R1_K1": [
        //     "0x2E29537bBaf8AB5dC8037Fa4Bc3DEB2c289498A3",
        //     "0x144F02c15a8CB2E01D35bf2af8e9eFD96401e44b"
        // ],
        MULTI_CHAIN_ECDSA: ["0x5C97aA67Ba578E3c54ec5942A7563Ea9130E4f5F"]
        // "MULTI_CHAIN_WEIGHTED": [
        //     "0xA99cD3c93773dA7f321A28a97648b608f347E6A1"
        // ]
    },
    [KERNEL_V3_1]: {
        ECDSA: ["0x845ADb2C711129d4f3966735eD98a9F09fC4cE57"],
        WEIGHTED_ECDSA: ["0xeD89244160CfE273800B58b1B534031699dFeEEE"],
        // "WEIGHTED_R1_K1": [
        //     "0x2E29537bBaf8AB5dC8037Fa4Bc3DEB2c289498A3",
        //     "0x144F02c15a8CB2E01D35bf2af8e9eFD96401e44b"
        // ],
        MULTI_CHAIN_ECDSA: ["0x5C97aA67Ba578E3c54ec5942A7563Ea9130E4f5F"]
        // "MULTI_CHAIN_WEIGHTED": [
        //     "0xA99cD3c93773dA7f321A28a97648b608f347E6A1"
        // ]
    },
    [KERNEL_V3_2]: {
        ECDSA: ["0x845ADb2C711129d4f3966735eD98a9F09fC4cE57"],
        WEIGHTED_ECDSA: ["0xeD89244160CfE273800B58b1B534031699dFeEEE"],
        // "WEIGHTED_R1_K1": [
        //     "0x2E29537bBaf8AB5dC8037Fa4Bc3DEB2c289498A3",
        //     "0x144F02c15a8CB2E01D35bf2af8e9eFD96401e44b"
        // ],
        MULTI_CHAIN_ECDSA: ["0x5C97aA67Ba578E3c54ec5942A7563Ea9130E4f5F"]
        // "MULTI_CHAIN_WEIGHTED": [
        //     "0xA99cD3c93773dA7f321A28a97648b608f347E6A1"
        // ]
    },
    [KERNEL_V3_3]: {
        ECDSA: ["0x845ADb2C711129d4f3966735eD98a9F09fC4cE57"],
        WEIGHTED_ECDSA: ["0xeD89244160CfE273800B58b1B534031699dFeEEE"],
        // "WEIGHTED_R1_K1": [
        //     "0x2E29537bBaf8AB5dC8037Fa4Bc3DEB2c289498A3",
        //     "0x144F02c15a8CB2E01D35bf2af8e9eFD96401e44b"
        // ],
        MULTI_CHAIN_ECDSA: ["0x5C97aA67Ba578E3c54ec5942A7563Ea9130E4f5F"]
        // "MULTI_CHAIN_WEIGHTED": [
        //     "0xA99cD3c93773dA7f321A28a97648b608f347E6A1"
        // ]
    }
} satisfies Partial<
    Record<KERNEL_VERSION_TYPE, Partial<Record<VALIDATOR_TYPE, Address[]>>>
>
