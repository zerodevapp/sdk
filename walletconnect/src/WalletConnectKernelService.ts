import { hexToUtf8 } from "@walletconnect/encoding"
import { formatJsonRpcError } from "@walletconnect/jsonrpc-utils"
import type { SessionTypes } from "@walletconnect/types"
import { getSdkError } from "@walletconnect/utils"
import type { Web3WalletTypes } from "@walletconnect/web3wallet"
import type { KernelAccountClient } from "@zerodev/sdk"
import { KernelEIP1193Provider } from "@zerodev/wallet"
import type { EntryPoint } from "permissionless/types"
import WalletConnectWallet from "./WalletConnectWallet"
import { stripEip155Prefix } from "./constants"

class WalletConnectKernelService {
    private wcWallet: WalletConnectWallet | undefined
    private kernelProvider: KernelEIP1193Provider<EntryPoint> | undefined

    constructor() {
        this.wcWallet = new WalletConnectWallet()
    }

    async init({
        walletConnectProjectId,
        walletConnectMetadata,
        kernelClient,
        kernelProvider
    }: {
        walletConnectProjectId: string
        walletConnectMetadata: any
        kernelClient?: KernelAccountClient<EntryPoint>
        kernelProvider?: KernelEIP1193Provider<EntryPoint>
    }) {
        if (!this.wcWallet) return
        if (!kernelClient && !kernelProvider) {
            throw new Error("Kernel client or provider must be provided")
        }
        await this.wcWallet.init({
            projectId: walletConnectProjectId,
            metadata: walletConnectMetadata
        })
        if (kernelProvider) {
            this.kernelProvider = kernelProvider
        } else if (kernelClient) {
            this.kernelProvider = new KernelEIP1193Provider(kernelClient)
        }
    }

    async connect(uri: string) {
        if (!this.wcWallet) return
        if (uri && !uri.startsWith("wc:")) {
            throw new Error("Invalid pairing code")
        }
        await this.wcWallet.connect(uri)
    }

    async disconnect(session: SessionTypes.Struct) {
        if (!this.wcWallet) return
        await this.wcWallet.disconnectSession(session)
    }

    onSessionRequest(
        handler: (request: Web3WalletTypes.SessionRequest) => void
    ) {
        if (!this.wcWallet) return
        this.wcWallet.onRequest(handler)
    }

    onSessionProposal(
        handler: (proposal: Web3WalletTypes.SessionProposal) => void
    ) {
        if (!this.wcWallet) return
        this.wcWallet.onSessionPropose(handler)
    }

    onSessionAdd(handler: () => void) {
        if (!this.wcWallet) return
        this.wcWallet.onSessionAdd(handler)
    }

    onSessionDelete(handler: () => void) {
        if (!this.wcWallet) return
        this.wcWallet.onSessionDelete(handler)
    }

    async approveSessionProposal(
        proposal: Web3WalletTypes.SessionProposal,
        chainId: string,
        address: string
    ) {
        if (!this.wcWallet) return
        await this.wcWallet.approveSession(proposal, chainId, address)
    }

    async rejectSessionProposal(proposal: Web3WalletTypes.SessionProposal) {
        if (!this.wcWallet) return
        await this.wcWallet.rejectSession(proposal)
    }

    async approveSessionRequest(
        request: Web3WalletTypes.SessionRequest,
        chainId: string
    ) {
        if (!this.wcWallet) return

        const { topic } = request
        const session = this.wcWallet
            .getActiveSessions()
            .find((s) => s.topic === topic)
        const requestChainId = stripEip155Prefix(request.params.chainId)

        const getResponse = () => {
            // Get error if wrong chain
            if (
                !session ||
                Number.parseInt(requestChainId) !== Number.parseInt(chainId)
            ) {
                const error = getSdkError("UNSUPPORTED_CHAINS")
                return formatJsonRpcError(request.id, error)
            }
            return this.handleKernelRequest(request)
        }

        try {
            const response = await getResponse()

            // Send response to WalletConnect
            await this.wcWallet.sendSessionResponse(topic, response)
        } catch (e) {
            const errorResponse = formatJsonRpcError(request.id, {
                code: 5000,
                message: (e as Error)?.message
            })
            await this.wcWallet.sendSessionResponse(topic, errorResponse)
        }
    }

    async rejectSessionRequest(request: Web3WalletTypes.SessionRequest) {
        if (!this.wcWallet) return

        const { topic, id } = request
        const errorResponse = formatJsonRpcError(id, {
            code: 5000,
            message: "User Rejected"
        })
        await this.wcWallet.sendSessionResponse(topic, errorResponse)
    }

    getActiveSessions() {
        if (!this.wcWallet) return
        return this.wcWallet.getActiveSessions()
    }

    async handleKernelRequest(event: Web3WalletTypes.SessionRequest) {
        if (!this.kernelProvider) {
            throw new Error("Kernel provider not initialized")
        }

        const { params, id } = event
        const { request } = params
        if (request.method === "personal_sign") {
            const requestParamsMessage = request.params[0]

            const message = hexToUtf8(requestParamsMessage)
            const signedMessage = await this.kernelProvider.request({
                ...request,
                params: [message, request.params[1]]
            })

            return { id, result: signedMessage, jsonrpc: "2.0" }
        }

        if (request.method === "eth_sign") {
            const requestParamsMessage = request.params[1]

            const message = hexToUtf8(requestParamsMessage)
            const signedMessage = await this.kernelProvider.request({
                ...request,
                params: [request.params[0], message]
            })

            return { id, result: signedMessage, jsonrpc: "2.0" }
        }

        const result = await this.kernelProvider.request(request)
        return {
            jsonrpc: "2.0",
            id: id,
            result
        }
    }
}

export default WalletConnectKernelService
