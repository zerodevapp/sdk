import { Core } from "@walletconnect/core"
import type { JsonRpcResponse } from "@walletconnect/jsonrpc-utils"
import type { CoreTypes, SessionTypes } from "@walletconnect/types"
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils"
import { Web3Wallet } from "@walletconnect/web3wallet"
import type Web3WalletType from "@walletconnect/web3wallet"
import type { Web3WalletTypes } from "@walletconnect/web3wallet"
import { uniq } from "lodash"
import {
    EIP155,
    KERNEL_COMPATIBLE_EVENTS,
    KERNEL_COMPATIBLE_METHODS
} from "./constants"
import { getEip155ChainId, stripEip155Prefix } from "./utils"

const SESSION_ADD_EVENT = "session_add" as Web3WalletTypes.Event // Workaround: WalletConnect doesn't emit session_add event
const SESSION_REJECT_EVENT = "session_reject" as Web3WalletTypes.Event // Workaround: WalletConnect doesn't emit session_reject event

class WalletConnectWallet {
    private web3Wallet: Web3WalletType | null = null

    public async init({
        projectId,
        metadata
    }: {
        projectId: string
        metadata: CoreTypes.Metadata
    }) {
        if (this.web3Wallet) return

        const core = new Core({
            projectId
        })

        const web3wallet = await Web3Wallet.init({
            core,
            metadata
        })

        this.web3Wallet = web3wallet
    }

    /**
     * Subscribe to session proposals
     */
    public onSessionPropose(
        handler: (e: Web3WalletTypes.SessionProposal) => void
    ) {
        // Subscribe to the session proposal event
        this.web3Wallet?.on("session_proposal", handler)

        // Return the unsubscribe function
        return () => {
            this.web3Wallet?.off("session_proposal", handler)
        }
    }

    public async approveSession(
        proposal: Web3WalletTypes.SessionProposal,
        currentChainId: string,
        kernelAddress: string
    ) {
        if (!this.web3Wallet) throw new Error("WalletConnect not initialized")

        const namespaces = this.getNamespaces(
            proposal,
            currentChainId,
            kernelAddress
        )

        // Approve the session proposal
        const session = await this.web3Wallet.approveSession({
            id: proposal.id,
            namespaces
        })

        const updatedNamespaces = {
            ...session.namespaces,
            ...this.getNamespaces(proposal, currentChainId, kernelAddress, true)
        }

        await this.web3Wallet.updateSession({
            topic: session.topic,
            namespaces: updatedNamespaces
        })

        await this.chainChanged(session.topic, currentChainId)

        // Workaround: WalletConnect doesn't have a session_add event
        // and we want to update our state inside the useWalletConnectSessions hook
        this.web3Wallet?.events.emit(SESSION_ADD_EVENT, session)

        // Return updated session as it may have changed
        return (
            this.getActiveSessions().find(
                ({ topic }) => topic === session.topic
            ) ?? session
        )
    }

    private getNamespaces(
        proposal: Web3WalletTypes.SessionProposal,
        currentChainId: string,
        kernelAddress: string,
        optional = false
    ) {
        const requiredChains =
            proposal.params.requiredNamespaces[EIP155]?.chains || []
        const optionalChains =
            proposal.params.optionalNamespaces[EIP155]?.chains || []

        const supportedChainIds = [currentChainId].concat(
            requiredChains.map(stripEip155Prefix),
            optional ? optionalChains.map(stripEip155Prefix) : []
        )

        const eip155ChainIds = supportedChainIds.map(getEip155ChainId)
        const eip155Accounts = eip155ChainIds.map(
            (eip155ChainId) => `${eip155ChainId}:${kernelAddress}`
        )

        // Don't include optionalNamespaces methods/events
        const methods = uniq(
            (proposal.params.requiredNamespaces[EIP155]?.methods || []).concat(
                KERNEL_COMPATIBLE_METHODS
            )
        )
        const events = uniq(
            (proposal.params.requiredNamespaces[EIP155]?.events || []).concat(
                KERNEL_COMPATIBLE_EVENTS
            )
        )

        return buildApprovedNamespaces({
            proposal: proposal.params,
            supportedNamespaces: {
                [EIP155]: {
                    chains: eip155ChainIds,
                    accounts: eip155Accounts,
                    methods,
                    events
                }
            }
        })
    }

    public async chainChanged(topic: string, chainId: string) {
        const eipChainId = getEip155ChainId(chainId)

        return this.web3Wallet?.emitSessionEvent({
            topic,
            event: {
                name: "chainChanged",
                data: Number(chainId)
            },
            chainId: eipChainId
        })
    }

    /**
     * Get active sessions
     */
    public getActiveSessions(): SessionTypes.Struct[] {
        const sessionsMap = this.web3Wallet?.getActiveSessions() || {}
        return Object.values(sessionsMap)
    }

    /**
     * Connect using a wc-URI
     */
    public async connect(uri: string) {
        if (!this.web3Wallet) throw new Error("WalletConnect not initialized")
        return this.web3Wallet.pair({ uri })
    }

    public async rejectSession(proposal: Web3WalletTypes.SessionProposal) {
        if (!this.web3Wallet) throw new Error("WalletConnect not initialized")

        await this.web3Wallet.rejectSession({
            id: proposal.id,
            reason: getSdkError("USER_REJECTED")
        })

        // Workaround: WalletConnect doesn't have a session_reject event
        this.web3Wallet?.events.emit(SESSION_REJECT_EVENT, proposal)
    }

    /**
     * Subscribe to requests
     */
    public onRequest(handler: (event: Web3WalletTypes.SessionRequest) => void) {
        this.web3Wallet?.on("session_request", handler)

        return () => {
            this.web3Wallet?.off("session_request", handler)
        }
    }

    /**
     * Send a response to a request
     */
    public async sendSessionResponse(
        topic: string,
        response: JsonRpcResponse<unknown>
    ) {
        if (!this.web3Wallet) throw new Error("WalletConnect not initialized")

        return await this.web3Wallet.respondSessionRequest({ topic, response })
    }

    /**
     * Disconnect a session
     */
    public async disconnectSession(session: SessionTypes.Struct) {
        if (!this.web3Wallet) throw new Error("WalletConnect not initialized")

        await this.web3Wallet.disconnectSession({
            topic: session.topic,
            reason: getSdkError("USER_DISCONNECTED")
        })

        // Workaround: WalletConnect doesn't emit session_delete event when disconnecting from the wallet side
        // and we want to update the state inside the useWalletConnectSessions hook
        this.web3Wallet.events.emit("session_delete", session)
    }

    /**
     * Subscribe to session delete
     */
    public onSessionDelete = (
        handler: (session: SessionTypes.Struct) => void
    ) => {
        // @ts-expect-error - custom event payload
        this.web3Wallet?.on("session_delete", handler)

        return () => {
            // @ts-expect-error - custom event payload
            this.web3Wallet?.off("session_delete", handler)
        }
    }

    /**
     * Subscribe to session add
     */
    public onSessionAdd = (handler: (e: SessionTypes.Struct) => void) => {
        // @ts-expect-error - custom event payload
        this.web3Wallet?.on(SESSION_ADD_EVENT, handler)

        return () => {
            // @ts-expect-error - custom event payload
            this.web3Wallet?.off(SESSION_ADD_EVENT, handler)
        }
    }

    private async updateSession(
        session: SessionTypes.Struct,
        chainId: string,
        address: string
    ) {
        if (!this.web3Wallet) throw new Error("WalletConnect not initialized")

        const currentEip155ChainIds = session.namespaces[EIP155]?.chains || []
        const currentEip155Accounts = session.namespaces[EIP155]?.accounts || []

        const newEip155ChainId = getEip155ChainId(chainId)
        const newEip155Account = `${newEip155ChainId}:${address}`

        const isUnsupportedChain =
            !currentEip155ChainIds.includes(newEip155ChainId)
        const isNewSession = !currentEip155Accounts.includes(newEip155Account)

        // Switching to unsupported chain
        if (isUnsupportedChain) {
            return this.disconnectSession(session)
        }

        // Add new account to the session namespace
        if (isNewSession) {
            const namespaces: SessionTypes.Namespaces = {
                [EIP155]: {
                    ...session.namespaces[EIP155],
                    chains: currentEip155ChainIds,
                    accounts: [newEip155Account, ...currentEip155Accounts]
                }
            }

            await this.web3Wallet.updateSession({
                topic: session.topic,
                namespaces
            })
        }

        // Switch to the new chain
        await this.chainChanged(session.topic, chainId)

        // Switch to the new account
        await this.accountsChanged(session.topic, chainId, address)
    }

    public async accountsChanged(
        topic: string,
        chainId: string,
        address: string
    ) {
        const eipChainId = getEip155ChainId(chainId)

        return this.web3Wallet?.emitSessionEvent({
            topic,
            event: {
                name: "accountsChanged",
                data: [address]
            },
            chainId: eipChainId
        })
    }

    public async updateSessions(chainId: string, address: string) {
        // If updating sessions disconnects multiple due to an unsupported chain,
        // we need to wait for the previous session to disconnect before the next
        for await (const session of this.getActiveSessions()) {
            await this.updateSession(session, chainId, address)
        }
    }
}

export default WalletConnectWallet
