import { EventEmitter } from "events"
import type { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk"
import { addressToEmptyAccount, createKernelAccountClient } from "@zerodev/sdk"
import type { SponsorUserOperationReturnType } from "@zerodev/sdk/actions"
import { createZeroDevPaymasterClient } from "@zerodev/sdk/clients"
import {
    type Delegation,
    ROOT_AUTHORITY,
    createSessionAccount,
    getDelegationTupleType
} from "@zerodev/session-account"
import { dmActionsEip7710 } from "@zerodev/session-account/clients"
import {
    type BundlerClient,
    ENTRYPOINT_ADDRESS_V06,
    ENTRYPOINT_ADDRESS_V07,
    type EstimateUserOperationGasReturnType,
    bundlerActions
} from "permissionless"
import {
    type GetPaymasterDataParameters,
    type GetPaymasterDataReturnType,
    type GetPaymasterStubDataReturnType,
    paymasterActionsEip7677
} from "permissionless/experimental"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    ENTRYPOINT_ADDRESS_V07_TYPE,
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
    LocalAccount,
    SendTransactionParameters,
    Transport
} from "viem"
import {
    http,
    type Hex,
    decodeAbiParameters,
    encodeAbiParameters,
    isHex,
    keccak256,
    toHex
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import type {
    GetCallsParams,
    GetCallsResult,
    GrantPermissionsParams,
    PaymasterServiceCapability,
    SendCallsParams,
    SendCallsResult,
    SessionType
} from "./types"
import { getCaveats, validatePermissions } from "./utils/permissions"
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

        const permissions =
            kernelClient.account.entryPoint === ENTRYPOINT_ADDRESS_V07
                ? {
                      supported: true,
                      permissionTypes: [
                          "sudo",
                          "contract-call",
                          "rate-limit",
                          "gas-limit",
                          "signature",
                          "erc20-token-approve"
                      ]
                  }
                : {
                      supported: false
                  }

        const capabilities = {
            [kernelClient.account.address]: {
                [toHex(kernelClient.chain.id)]: {
                    atomicBatch: {
                        supported: true
                    },
                    paymasterService: {
                        supported: true
                    },
                    permissions
                }
            }
        }
        this.storeItemToStorage(WALLET_CAPABILITIES_STORAGE_KEY, capabilities)
        this.bundlerClient = kernelClient.extend(
            bundlerActions(kernelClient.account.entryPoint)
        )
    }

    getChainId() {
        return this.handleGetChainId()
    }

    async request({
        method,
        params = []
    }: EIP1193Parameters): ReturnType<EIP1193RequestFn> {
        switch (method) {
            case "eth_chainId":
                return this.handleGetChainId()
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
            case "wallet_getCallsStatus":
                return this.handleWalletGetCallStatus(
                    params as [GetCallsParams]
                )
            case "wallet_grantPermissions":
                return this.handleWalletGrantPermissions(
                    params as [GrantPermissionsParams]
                )
            case "wallet_switchEthereumChain":
                return this.handleSwitchEthereumChain()
            default:
                return this.kernelClient.transport.request({ method, params })
        }
    }

    private handleGetChainId() {
        return this.kernelClient.chain.id
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
        if (
            this.kernelClient.account.entryPoint !== ENTRYPOINT_ADDRESS_V07 &&
            capabilities?.permissions
        ) {
            throw new Error("Permissions not supported with kernel v2")
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
            ? keccak256(capabilities?.permissions?.sessionId)
            : undefined
        const session = permission?.[accountAddress]?.[
            toHex(accountChainId)
        ]?.find((session) => session.sessionId === sessionId)
        if (session && this.kernelClient?.account?.client) {
            const sessionKeySigner = privateKeyToAccount(
                session.signerPrivateKey
            )

            const [delegations, delegatorInitCode] = decodeAbiParameters(
                [getDelegationTupleType(true), { type: "bytes" }],
                session.approval as Hex
            )
            const sessionAccount = await createSessionAccount(
                this.kernelClient.account.client as Client<
                    Transport,
                    Chain,
                    undefined
                >,
                {
                    entryPoint: this.kernelClient.account.entryPoint,
                    sessionKeySigner,
                    delegations: delegations as Delegation[],
                    delegatorInitCode
                }
            )

            const kernelClient = createKernelAccountClient({
                account:
                    sessionAccount as unknown as KernelSmartAccount<entryPoint>,
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

        const encodedCall = await kernelAccountClient.account.encodeCallData(
            calls.map((call) => ({
                to: call.to ?? kernelAccountClient.account.address,
                value: call.value ? BigInt(call.value) : 0n,
                data: call.data ?? "0x"
            }))
        )

        return await kernelAccountClient.sendUserOperation({
            userOperation: {
                callData: encodedCall
            }
        })
    }

    private handleWalletCapabilities() {
        const capabilities = this.getItemFromStorage(
            WALLET_CAPABILITIES_STORAGE_KEY
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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

    private async handleWalletGrantPermissions(
        params: [GrantPermissionsParams]
    ) {
        if (this.kernelClient.account.entryPoint !== ENTRYPOINT_ADDRESS_V07) {
            throw new Error("Permissions not supported with kernel v2")
        }
        const capabilities =
            this.handleWalletCapabilities()[toHex(this.kernelClient.chain.id)]
                .permissions.permissionTypes

        validatePermissions(params[0], capabilities)
        const caveats = getCaveats(params[0])
        const permissions = params[0].permissions

        // signer
        let sessionPrivateKey: Hex = "0x"
        let sessionKeySigner: LocalAccount
        if (params[0].signer?.type === "account") {
            sessionKeySigner = addressToEmptyAccount(params[0].signer.data.id)
        } else if (params[0].signer?.type === "wallet") {
            sessionPrivateKey = generatePrivateKey()
            sessionKeySigner = privateKeyToAccount(sessionPrivateKey)
        } else {
            throw new Error("Signer not supported")
        }

        const delegations: Delegation[] = [
            {
                delegator: this.kernelClient.account.address,
                delegate: sessionKeySigner.address,
                authority: ROOT_AUTHORITY,
                caveats,
                salt: 0n,
                signature: "0x"
            }
        ]
        const kernelClientDM = this.kernelClient.extend(
            dmActionsEip7710<entryPoint, KernelSmartAccount<entryPoint>>()
        )

        const mainDeleGatorSignature = await kernelClientDM.signDelegation({
            delegation: delegations[0]
        })
        delegations[0].signature = mainDeleGatorSignature

        const mainDelegatorAccountInitCode =
            await this.kernelClient.account.getInitCode()
        const permissionsContext = encodeAbiParameters(
            [getDelegationTupleType(true), { type: "bytes" }],
            [delegations, mainDelegatorAccountInitCode]
        )

        const createdPermissions =
            this.getItemFromStorage(WALLET_PERMISSION_STORAGE_KEY) || {}

        const newPermission = {
            sessionId: keccak256(permissionsContext),
            entryPoint: this.kernelClient.account.entryPoint,
            signerPrivateKey: sessionPrivateKey,
            approval: permissionsContext
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
                data: permission.data,
                policies: permission.policies
            })),
            expiry: params[0].expiry,
            permissionsContext
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
            const paymasterEip7677Client = paymasterClient.extend(
                paymasterActionsEip7677(entryPoint)
            )

            // 1. get stub data from paymasterService
            const stubData = await paymasterEip7677Client.getPaymasterStubData({
                userOperation: userOperation,
                chain: chain
            })
            const stubUserOperation = {
                ...userOperation,
                ...stubData
            }
            const hexStubUserOperation = Object.fromEntries(
                Object.entries(stubUserOperation).map(([key, value]) => {
                    if (typeof value === "bigint") return [key, toHex(value)]
                    return [key, value]
                })
            )

            // 2. estimate userOp gas
            const gas = (await this.kernelClient.request({
                method: "eth_estimateUserOperationGas",
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                params: [hexStubUserOperation as any, entryPoint]
            })) as EstimateUserOperationGasReturnType<entryPoint>

            const userOperationWithGas = {
                ...stubUserOperation,
                callGasLimit: gas.callGasLimit,
                verificationGasLimit: gas.verificationGasLimit,
                preVerificationGas: gas.preVerificationGas
            } as GetPaymasterDataParameters<entryPoint>["userOperation"]

            // 3. get paymaster data
            const paymasterData = await paymasterEip7677Client.getPaymasterData(
                {
                    userOperation: userOperationWithGas,
                    chain: chain
                }
            )

            if (entryPoint === ENTRYPOINT_ADDRESS_V06) {
                const paymasterDataV06 =
                    paymasterData as GetPaymasterDataReturnType<ENTRYPOINT_ADDRESS_V06_TYPE>
                return {
                    callGasLimit: BigInt(gas.callGasLimit),
                    verificationGasLimit: BigInt(gas.verificationGasLimit),
                    preVerificationGas: BigInt(gas.preVerificationGas),
                    paymasterAndData: paymasterDataV06?.paymasterAndData,
                    maxFeePerGas: BigInt(userOperation.maxFeePerGas),
                    maxPriorityFeePerGas: BigInt(
                        userOperation.maxPriorityFeePerGas
                    )
                } as SponsorUserOperationReturnType<entryPoint>
            }
            const stubDataV07 =
                stubData as GetPaymasterStubDataReturnType<ENTRYPOINT_ADDRESS_V07_TYPE>
            const paymasterDataV07 =
                paymasterData as GetPaymasterDataReturnType<ENTRYPOINT_ADDRESS_V07_TYPE>

            return {
                callGasLimit: BigInt(gas.callGasLimit),
                verificationGasLimit: BigInt(gas.verificationGasLimit),
                preVerificationGas: BigInt(gas.preVerificationGas),
                paymaster: paymasterDataV07.paymaster,
                paymasterData: paymasterDataV07.paymasterData,
                paymasterVerificationGasLimit:
                    stubDataV07.paymasterVerificationGasLimit &&
                    BigInt(stubDataV07.paymasterVerificationGasLimit),
                paymasterPostOpGasLimit:
                    stubDataV07?.paymasterPostOpGasLimit &&
                    BigInt(stubDataV07.paymasterPostOpGasLimit),
                maxFeePerGas: BigInt(userOperation.maxFeePerGas),
                maxPriorityFeePerGas: BigInt(userOperation.maxPriorityFeePerGas)
            } as SponsorUserOperationReturnType<entryPoint>
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
