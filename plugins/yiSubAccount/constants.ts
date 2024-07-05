import type { Address } from "viem"
import type { YI_SUB_ACCOUNT_VERSION_TYPE } from "./types"

export const MAGIC_BYTES =
    "0x6492649264926492649264926492649264926492649264926492649264926492"

export const YiSubAccountVersionToAddressesMap: {
    [key in YI_SUB_ACCOUNT_VERSION_TYPE]: {
        factoryAddress: Address
        delegationManagerAddress: Address
    }
} = {
    "0.0.1": {
        // factoryAddress: "0x2DE01db4Cbf11c890049db5Da3128C293f56058C",
        factoryAddress: "0x95Daa8e89F846B1eE9AcF77F42774294172960fd",
        delegationManagerAddress: "0xe850c0DdDe1cb9c6Aa514d067621283bfEef59BF"
    }
}
