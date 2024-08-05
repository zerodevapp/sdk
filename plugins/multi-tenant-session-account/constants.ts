import type { Address } from "viem"
import type { DM_VERSION_TYPE } from "./types"

export const MAGIC_BYTES =
    "0x6492649264926492649264926492649264926492649264926492649264926492"

export const SUBACCOUNT_API_URL =
    "https://yield-api-kgjy.onrender.com/subaccount/transfers-data"

export const MULTI_TENANT_SESSION_ACCOUNT_ADDRESS =
    "0x6F5c16285A19348258F8F0Eb7cBBC7f79E89b59C"

export const ROOT_AUTHORITY =
    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export const DELEGATION_TYPE_STRING =
    "Delegation(address delegate,address delegator,bytes32 authority,Caveat[] caveats,uint256 salt)Caveat(address enforcer,bytes terms)"

export const DMVersionToAddressMap: {
    [key in DM_VERSION_TYPE]: {
        delegationManagerAddress: Address
    }
} = {
    "1.0.0": {
        delegationManagerAddress: "0xa77f115310a5761D048790231B0BdB29FD857Ce2"
        // delegationManagerAddress: "0x974A51f51Ae7585250C2902a292E50F4cb4489dD"
    }
}
