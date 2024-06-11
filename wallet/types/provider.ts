import type { EntryPoint } from "permissionless/types"
import type { Address, Hex } from "viem"

export type PaymasterServiceCapability = {
    url: string
}

// wallet_sendCalls
export type SendCallsParams = {
    version: string
    chainId: `0x${string}` // Hex chain id
    from: `0x${string}`
    calls: {
        to?: `0x${string}` | undefined
        data?: `0x${string}` | undefined
        value?: `0x${string}` | undefined // Hex value
    }[]
    capabilities?: Record<string, any> | undefined
}

export type SendCallsResult = string

// wallet_getCallStatus
export type GetCallsParams = string

export type GetCallsResult = {
    status: "PENDING" | "CONFIRMED"
    receipts?: {
        logs: {
            address: `0x${string}`
            data: `0x${string}`
            topics: `0x${string}`[]
        }[]
        status: `0x${string}` // Hex 1 or 0 for success or failure, respectively
        blockHash: `0x${string}`
        blockNumber: `0x${string}`
        gasUsed: `0x${string}`
        transactionHash: `0x${string}`
    }[]
}

// wallet_showCallsStatus
export type ShowCallsParams = string

// wallet_issuePermissions
export type IssuePermissionsParams = {
    permissions: {
        type: string
        data: Record<string, any>
        required: boolean
    }[]
    expiry: number
}

export type IssuePermissionsResult = {
    sessionId: string
}

export type SessionType = {
    [address: Address]: {
        [chainId: Hex]: {
            sessionId: Hex
            entryPoint: EntryPoint
            signerPrivateKey: Hex
            approval: string
        }[]
    }
}

export type ZeroDevVersion = "v2" | "v3"
