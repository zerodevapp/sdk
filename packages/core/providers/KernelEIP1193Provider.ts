import { EventEmitter } from "events"
import { type KernelAccountClient } from "@zerodev/sdk"
import type { EntryPoint } from "permissionless/types"
import {
    type EIP1193Parameters,
    type EIP1193RequestFn,
    type Hash,
    type SendTransactionParameters
} from "viem"

export class KernelEIP1193Provider<
    entryPoint extends EntryPoint
> extends EventEmitter {
    private kernelClient: KernelAccountClient<entryPoint>

    constructor(kernelClient: KernelAccountClient<entryPoint>) {
        super()
        this.kernelClient = kernelClient
    }

    async request({
        method,
        params = []
    }: EIP1193Parameters): ReturnType<EIP1193RequestFn> {
        switch (method) {
            case "eth_requestAccounts":
                return this.handleEthRequestAccounts()
            case "eth_accounts":
                return this.handleEthAccounts()
            case "eth_sendTransaction":
                return this.handleEthSendTransaction(params)
            case "personal_sign":
                return this.handlePersonalSign(params as [string, string])
            default:
                return this.kernelClient.transport.request({ method, params })
        }
    }

    private async handleEthRequestAccounts(): Promise<string[]> {
        if (!this.kernelClient.account) {
            return []
        }
        return [this.kernelClient.account.address]
    }

    private async handleEthAccounts(): Promise<string[]> {
        if (!this.kernelClient.account) {
            return []
        }
        return [this.kernelClient.account.address]
    }

    private async handleEthSendTransaction(params: unknown): Promise<Hash> {
        const [tx] = params as [SendTransactionParameters]
        return this.kernelClient.sendTransaction(tx)
    }

    private async handlePersonalSign(
        params: [string, string]
    ): Promise<string> {
        if (!this.kernelClient?.account) {
            throw new Error("account not connected!")
        }
        const [message, address] = params
        if (
            address.toLowerCase() !==
            this.kernelClient.account.address.toLowerCase()
        ) {
            throw new Error(
                "cannot sign for address that is not the current account"
            )
        }

        return this.kernelClient.signMessage({
            message,
            account: this.kernelClient.account
        })
    }
}
