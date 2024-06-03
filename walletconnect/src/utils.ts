import type { ProposalTypes, SessionTypes } from "@walletconnect/types"
import { EIP155 } from "./constants"

export const stripEip155Prefix = (eip155Address: string): string => {
    return eip155Address.split(":").pop() ?? ""
}

export const getEip155ChainId = (chainId: string): string => {
    return `${EIP155}:${chainId}`
}

export const asError = (thrown: unknown): Error => {
    if (thrown instanceof Error) {
        return thrown
    }

    let message: string

    if (typeof thrown === "string") {
        message = thrown
    } else {
        try {
            message = JSON.stringify(thrown)
        } catch {
            message = String(thrown)
        }
    }

    return new Error(message)
}

enum Errors {
    WRONG_CHAIN = "%%dappName%% made a request on a different chain than the one you are connected to"
}

export const getWrongChainError = (dappName: string): Error => {
    const message = Errors.WRONG_CHAIN.replace("%%dappName%%", dappName)
    return new Error(message)
}

export const getPeerName = (
    peer: SessionTypes.Struct["peer"] | ProposalTypes.Struct["proposer"]
): string => {
    return peer.metadata?.name || peer.metadata?.url || ""
}
