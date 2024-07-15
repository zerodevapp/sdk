import type { Address } from "viem"
import type { YI_SUB_ACCOUNT_VERSION_TYPE } from "./types"

export const MAGIC_BYTES =
    "0x6492649264926492649264926492649264926492649264926492649264926492"

export const SUBACCOUNT_API_URL =
    "https://yield-api-kgjy.onrender.com/subaccount/transfers-data"

export const YiSubAccountVersionToAddressesMap: {
    [key in YI_SUB_ACCOUNT_VERSION_TYPE]: {
        factoryAddress: Address
        delegationManagerAddress: Address
    }
} = {
    // "0.0.1": {
    //     factoryAddress: "0x95Daa8e89F846B1eE9AcF77F42774294172960fd",
    //     delegationManagerAddress: "0xe850c0DdDe1cb9c6Aa514d067621283bfEef59BF"
    // },
    "0.0.1": {
        factoryAddress: "0x0F0F5D029DDBccb240EE9a226F2Ab6aD67C51809",
        delegationManagerAddress: "0x40289D2B84f288f27b1953E5CdF1081155b7cf23"
    }
}
