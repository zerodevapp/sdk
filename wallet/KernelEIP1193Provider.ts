import { EventEmitter } from "events"
import {
    deserializePermissionAccount,
    serializePermissionAccount,
    toPermissionValidator
} from "@zerodev/permissions"
import { toECDSASigner } from "@zerodev/permissions/signers"
import type { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk"
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk"
import type {
    SponsorUserOperationParameters,
    SponsorUserOperationReturnType
} from "@zerodev/sdk/actions"
import { createZeroDevPaymasterClient } from "@zerodev/sdk/clients"
import { type BundlerClient, bundlerActions } from "permissionless"
import type {
    EntryPoint,
    GetEntryPointVersion,
    UserOperation
} from "permissionless/types"
import type {
    Chain,
    Client,
    EIP1193Parameters,
    EIP1193RequestFn,
    Hash,
    SendTransactionParameters,
    Transport
} from "viem"
import { http, type Hex, isHex, toHex } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import type {
    GetCallsParams,
    GetCallsResult,
    IssuePermissionsParams,
    PaymasterServiceCapability,
    SendCallsParams,
    SendCallsResult,
    SessionType
} from "./types"
import { getPolicies, validatePermissions } from "./utils/permissions"
import { KernelLocalStorage } from "./utils/storage"

const WALLET_CAPABILITIES_STORAGE_KEY = "WALLET_CAPABILITIES"
const WALLET_PERMISSION_STORAGE_KEY = "WALLET_PERMISSION"

export class KernelEIP1193Provider<
    entryPoint extends EntryPoint
> extends EventEmitter {
    private readonly storage = new KernelLocalStorage("ZDWALLET")
    private kernelClient: KernelAccountClient<
        entryPoint,
        Transport,
        Chain,
        KernelSmartAccount<entryPoint>
    >
    private bundlerClient: BundlerClient<entryPoint>

    constructor(kernelClient: KernelAccountClient<entryPoint>) {
        super()
        if (
            typeof kernelClient.account !== "object" ||
            typeof kernelClient.chain !== "object"
        ) {
            throw new Error("invalid kernel client")
        }
        this.kernelClient = kernelClient as KernelAccountClient<
            entryPoint,
            Transport,
            Chain,
            KernelSmartAccount<entryPoint>
        >

        const capabilities = {
            [kernelClient.account.address]: {
                [toHex(kernelClient.chain.id)]: {
                    atomicBatch: {
                        supported: true
                    },
                    paymasterService: {
                        supported: true
                    },
                    permissions: {
                        supported: true,
                        permissionTypes: ["sudo", "call-contract"]
                    }
                }
            }
        }
        this.storeItemToStorage(WALLET_CAPABILITIES_STORAGE_KEY, capabilities)
        this.bundlerClient = kernelClient.extend(
            bundlerActions(kernelClient.account.entryPoint)
        )
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
            case "eth_sign":
                return this.handleEthSign(params as [string, string])
            case "personal_sign":
                return this.handlePersonalSign(params as [string, string])
            case "eth_signTypedData":
            case "eth_signTypedData_v4":
                return this.handleEthSignTypedDataV4(params as [string, string])
            case "wallet_getCapabilities":
                return this.handleWalletCapabilities()
            case "wallet_sendCalls":
                return this.handleWalletSendcalls(params as [SendCallsParams])
            case "wallet_getCallStatus":
                return this.handleWalletGetCallStatus(
                    params as [GetCallsParams]
                )
            case "wallet_issuePermissions":
                return this.handleWalletIssuePermissions(
                    params as [IssuePermissionsParams]
                )
            case "wallet_switchEthereumChain":
                return this.handleSwitchEthereumChain()
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

    private async handleEthSign(params: [string, string]): Promise<string> {
        if (!this.kernelClient?.account) {
            throw new Error("account not connected!")
        }
        const [address, message] = params
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

    private async handleEthSignTypedDataV4(
        params: [string, string]
    ): Promise<string> {
        if (!this.kernelClient?.account) {
            throw new Error("account not connected!")
        }
        const [address, typedDataJSON] = params
        const typedData = JSON.parse(typedDataJSON)
        if (
            address.toLowerCase() !==
            this.kernelClient.account.address.toLowerCase()
        ) {
            throw new Error(
                "cannot sign for address that is not the current account"
            )
        }

        return this.kernelClient.signTypedData({
            account: this.kernelClient.account,
            domain: typedData.domain,
            types: typedData.types,
            message: typedData.message,
            primaryType: typedData.primaryType
        })
    }

    private async handleSwitchEthereumChain() {
        throw new Error("Not implemented.")
    }

    private async handleWalletSendcalls(
        params: [SendCallsParams]
    ): Promise<SendCallsResult> {
        const accountAddress = this.kernelClient.account.address
        const accountChainId = this.kernelClient.chain.id

        const { calls, capabilities, from, chainId } = params[0]
        if (from !== accountAddress) {
            throw new Error("invalid account address")
        }
        if (Number(chainId) !== accountChainId) {
            throw new Error("invalid chain id")
        }

        let kernelAccountClient: KernelAccountClient<
            entryPoint,
            Transport,
            Chain,
            KernelSmartAccount<entryPoint>
        >
        const permission = this.getItemFromStorage(
            WALLET_PERMISSION_STORAGE_KEY
        ) as SessionType
        const paymasterService = await this.getPaymasterService(
            capabilities?.paymasterService,
            this.kernelClient.chain
        )

        const sessionId = capabilities?.permissions?.sessionId
        const session = permission[accountAddress][toHex(accountChainId)]?.find(
            (session) => session.sessionId === sessionId
        )
        if (session && this.kernelClient?.account?.client) {
            const sessionSigner = await toECDSASigner({
                signer: privateKeyToAccount(session.signerPrivateKey)
            })
            const sessionKeyAccount = await deserializePermissionAccount(
                this.kernelClient.account.client as any,
                this.kernelClient.account.entryPoint,
                session.approval,
                sessionSigner
            )

            const kernelClient = createKernelAccountClient({
                account: sessionKeyAccount,
                chain: this.kernelClient.chain,
                entryPoint: this.kernelClient.account.entryPoint,
                bundlerTransport: http(this.kernelClient.transport.url),
                middleware: {
                    sponsorUserOperation: paymasterService
                }
            })

            kernelAccountClient = kernelClient
        } else {
            kernelAccountClient = createKernelAccountClient({
                account: this.kernelClient.account,
                chain: this.kernelClient.chain,
                entryPoint: this.kernelClient.account.entryPoint,
                bundlerTransport: http(this.kernelClient.transport.url),
                middleware: {
                    sponsorUserOperation: paymasterService
                }
            })
        }

        const encodedeCall = await kernelAccountClient.account.encodeCallData(
            calls.map((call) => ({
                to: call.to ?? kernelAccountClient.account.address,
                value: call.value ? BigInt(call.value) : 0n,
                data: call.data ?? "0x"
            }))
        )

        return await kernelAccountClient.sendUserOperation({
            userOperation: {
                callData: encodedeCall
            }
        })
    }

    private handleWalletCapabilities() {
        const capabilities = this.getItemFromStorage(
            WALLET_CAPABILITIES_STORAGE_KEY
        ) as Record<string, any> | undefined

        return capabilities
            ? capabilities[this.kernelClient.account.address]
            : {}
    }

    private async handleWalletGetCallStatus(
        params: [GetCallsParams]
    ): Promise<GetCallsResult> {
        const userOpHash = params[0]

        if (!isHex(userOpHash)) {
            throw new Error(
                "Invalid params for wallet_getCallStatus: not a hex string"
            )
        }
        const result = await this.bundlerClient.getUserOperationReceipt({
            hash: userOpHash as Hex
        })
        if (!result?.success) {
            return {
                status: "PENDING"
            }
        }
        return {
            status: "CONFIRMED",
            receipts: [
                {
                    logs: result.logs.map((log) => ({
                        address: log.address,
                        data: log.data,
                        topics: log.topics
                    })),
                    status: result.success ? "0x1" : "0x0",
                    blockHash: result.receipt.blockHash,
                    blockNumber: toHex(result.receipt.blockNumber),
                    gasUsed: toHex(result.receipt.gasUsed),
                    transactionHash: result.receipt.transactionHash
                }
            ]
        }
    }

    private async handleWalletIssuePermissions(
        params: [IssuePermissionsParams]
    ) {
        const capabilities =
            this.handleWalletCapabilities()[toHex(this.kernelClient.chain.id)]
                .permissions.permissionTypes

        validatePermissions(params[0], capabilities)
        const policies = getPolicies(params[0])
        const permissions = params[0].permissions

        // signer
        const sessionPrivateKey = generatePrivateKey()
        const sessionKeySigner = toECDSASigner({
            signer: privateKeyToAccount(sessionPrivateKey)
        })

        const client = this.kernelClient.account.client as Client<
            Transport,
            Chain | undefined,
            undefined
        >

        const permissionValidator = await toPermissionValidator(client, {
            entryPoint: this.kernelClient.account.entryPoint,
            signer: sessionKeySigner,
            policies: policies
        })

        const sessionKeyAccount = await createKernelAccount(client, {
            entryPoint: this.kernelClient.account.entryPoint,
            plugins: {
                sudo: this.kernelClient.account.kernelPluginManager
                    .sudoValidator,
                regular: permissionValidator
            }
        })
        const enabledSignature =
            await sessionKeyAccount.kernelPluginManager.getPluginEnableSignature(
                sessionKeyAccount.address
            )
        const sessionKeyAccountWithSig = await createKernelAccount(client, {
            entryPoint: this.kernelClient.account.entryPoint,
            plugins: {
                sudo: this.kernelClient.account.kernelPluginManager
                    .sudoValidator,
                regular: permissionValidator,
                pluginEnableSignature: enabledSignature
            }
        })

        const createdPermissions =
            this.getItemFromStorage(WALLET_PERMISSION_STORAGE_KEY) || {}
        const newPermission = {
            sessionId: permissionValidator.getIdentifier(),
            entryPoint: this.kernelClient.account.entryPoint,
            signerPrivateKey: sessionPrivateKey,
            approval: await serializePermissionAccount(sessionKeyAccountWithSig)
        }

        const address = this.kernelClient.account.address
        const chainId = toHex(this.kernelClient.chain.id)

        const mergedPermissions: SessionType = { ...createdPermissions }

        if (!mergedPermissions[address]) {
            mergedPermissions[address] = {}
        }

        if (!mergedPermissions[address][chainId]) {
            mergedPermissions[address][chainId] = []
        }

        mergedPermissions[address][chainId].push(newPermission)
        this.storeItemToStorage(
            WALLET_PERMISSION_STORAGE_KEY,
            mergedPermissions
        )
        return {
            grantedPermissions: permissions.map((permission) => ({
                type: permission.type,
                data: permission.data
            })),
            expiry: params[0].expiry,
            permissionsContext: permissionValidator.getIdentifier()
        }
    }

    private async getPaymasterService(
        paymaster: PaymasterServiceCapability | undefined,
        chain: Chain
    ) {
        if (!paymaster?.url) return undefined

        // verifying paymaster
        return async ({
            userOperation,
            entryPoint
        }: {
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
            entryPoint: entryPoint
        }) => {
            const paymasterClient = createZeroDevPaymasterClient({
                chain: chain,
                entryPoint: entryPoint,
                transport: http(paymaster.url)
            })
            return paymasterClient.sponsorUserOperation({
                userOperation:
                    userOperation as SponsorUserOperationParameters<entryPoint>["userOperation"],
                entryPoint: entryPoint
            }) as Promise<SponsorUserOperationReturnType<entryPoint>>
        }
        // TODO: other paymaster services
    }

    private getItemFromStorage<T>(key: string): T | undefined {
        const item = this.storage.getItem(key)
        return item ? JSON.parse(item) : undefined
    }

    private storeItemToStorage<T>(key: string, item: T) {
        this.storage.setItem(key, JSON.stringify(item))
    }
}
