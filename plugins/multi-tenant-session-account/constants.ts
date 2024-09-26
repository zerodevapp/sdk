import type { Address } from "viem"
import type { DM_VERSION_TYPE } from "./types.js"

export const MAGIC_BYTES =
    "0x6492649264926492649264926492649264926492649264926492649264926492"

export const SUBACCOUNT_API_URL =
    "https://yield-api-kgjy.onrender.com/subaccount/transfers-data"

export const MULTI_TENANT_SESSION_ACCOUNT_ADDRESS =
    "0x16c15c5349eB67185b8A58020E57D71F57105f6d"

export const CAB_PAYMASTER_SERVER_URL =
    "https://cab-paymaster-service.onrender.com/paymaster/api"

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
        delegationManagerAddress: "0x942Eb55c0dD36297bdCd622cb3E2A5f4D6c750CD"
        // delegationManagerAddress: "0x77dB450f40737F53b63170A8A9cdb93FaDE366D1"
    }
}
