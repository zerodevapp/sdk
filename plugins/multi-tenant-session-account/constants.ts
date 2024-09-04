import type { Address } from "viem"
import type { DM_VERSION_TYPE } from "./types.js"

export const MAGIC_BYTES =
    "0x6492649264926492649264926492649264926492649264926492649264926492"

export const SUBACCOUNT_API_URL =
    "https://yield-api-kgjy.onrender.com/subaccount/transfers-data"

export const MULTI_TENANT_SESSION_ACCOUNT_ADDRESS =
    "0x465D2C76eE3173eeca6D439879E680Ca437C6AED"

export const CAB_PAYMASTER_SERVER_URL =
    "https://cab-paymaster-service-dev.onrender.com/paymaster/api"

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
        delegationManagerAddress: "0x852874907AC8eE238577928DbEE7b908Eb0BF480"
        // delegationManagerAddress: "0x77dB450f40737F53b63170A8A9cdb93FaDE366D1"
    }
}
