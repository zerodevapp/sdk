import type { Address } from "viem"
import type { DM_VERSION_TYPE, YI_SUB_ACCOUNT_VERSION_TYPE } from "./types"

export const MAGIC_BYTES =
    "0x6492649264926492649264926492649264926492649264926492649264926492"

export const SUBACCOUNT_API_URL =
    "https://yield-api-kgjy.onrender.com/subaccount/transfers-data"

export const MULTI_TENANT_SESSION_ACCOUNT_ADDRESS =
   "0xF76C1d6ED36d48aCF13d8c99c1ba497fb0073bdB" // "0x1D8B6e49eB4F3C923E71f67DbaF48A392A64717a" // "0xB61d4757EBab253baC629b0a909795980499d692"

export const ROOT_AUTHORITY =
    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export const DELEGATION_TYPE_STRING =
    "Delegation(address delegate,address delegator,bytes32 authority,Caveat[] caveats,uint256 salt)Caveat(address enforcer,bytes terms)"

export const YiSubAccountVersionToDMMap: {
    [key in DM_VERSION_TYPE]: {
        delegationManagerAddress: Address
    }
} = {
    "1.0.0": {
        delegationManagerAddress: "0x40289D2B84f288f27b1953E5CdF1081155b7cf23"
        // delegationManagerAddress: "0x974A51f51Ae7585250C2902a292E50F4cb4489dD"
    }
}

export const YiSubAccountVersionToFactoryMap: {
    [key in YI_SUB_ACCOUNT_VERSION_TYPE]: {
        factoryAddress: Address
    }
} = {
    "0.0.1": {
        factoryAddress: "0x0F0F5D029DDBccb240EE9a226F2Ab6aD67C51809"
        // factoryAddress: "0xC5bA1DD677a89f7675015cd96124702D5a2D3A40"
    }
}
