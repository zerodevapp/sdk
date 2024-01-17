import type {
    UserOperation,
    UserOperationWithBigIntAsHex
} from "permissionless/types/userOperation"
import {
    type Account,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type Transport
} from "viem"
import type { PartialBy } from "viem/types/utils"
export type ZeroDevPaymasterRpcSchema = [
    {
        Method: "zd_sponsorUserOperation"
        Parameters: [
            {
                chainId: number
                userOp: PartialBy<
                    UserOperationWithBigIntAsHex,
                    | "callGasLimit"
                    | "preVerificationGas"
                    | "verificationGasLimit"
                    | "paymasterAndData"
                >
                entryPointAddress: Address
                gasTokenData?: {
                    tokenAddress: Hex
                    erc20UserOp: PartialBy<
                        UserOperationWithBigIntAsHex,
                        | "callGasLimit"
                        | "preVerificationGas"
                        | "verificationGasLimit"
                        | "paymasterAndData"
                    >
                    erc20CallData: Hex
                }
                shouldOverrideFee?: boolean
                manualGasEstimation?: boolean
                shouldConsume?: boolean
            }
        ]
        ReturnType: {
            paymasterAndData: Hex
            preVerificationGas: Hex
            verificationGasLimit: Hex
            callGasLimit: Hex
            maxFeePerGas: Hex
            maxPriorityFeePerGas: Hex
        }
    }
]

export type KernelPlugin<
    Name extends string = string,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = LocalAccount<Name> & {
    signer: Account
    client: Client<transport, chain>
    entryPoint: Address
    getNonceKey: () => Promise<bigint>
    getDummySignature(
        userOperation: UserOperation,
        pluginEnableSignature?: Hex
    ): Promise<Hex>
    signUserOperation: (
        UserOperation: UserOperation,
        pluginEnableSignature?: Hex
    ) => Promise<Hex>
    getPluginEnableSignature(
        accountAddress: Address,
        plugin: KernelPlugin
    ): Promise<Hex>
    getEnableData(accountAddress?: Address): Promise<Hex>
    getExecutorData(): ExecutorData
    shouldDelegateViaFallback(): boolean
}

export type KernelValidator<Name extends string = string> =
    LocalAccount<Name> & {
        getNonceKey: () => Promise<bigint>
        getDummySignature(
            userOperation: UserOperation,
            pluginEnableSignature?: Hex
        ): Promise<Hex>
        signUserOperation: (
            userOperation: UserOperation,
            pluginEnableSignature?: Hex
        ) => Promise<Hex>
        getEnableData(accountAddress?: Address): Promise<Hex>
        getExecutorData(): ExecutorData
    }

export type ValidatorInitData = {
    validatorAddress: Address
    enableData: Promise<Hex>
}

export type KernelPluginManager = KernelValidator & {
    getEnableSignature(accountAddress: Address): Promise<Hex>
    getValidatorInitData(): ValidatorInitData
}

export type KernelPluginManagerParams = {
    validator: KernelValidator
    defaultValidator?: KernelValidator
    pluginEnableSignature?: Hex
}

export type ExecutorData = {
    executor: Address
    selector: Hex
    validUntil: number
    validAfter: number
}

export enum ValidatorMode {
    sudo = "0x00000000",
    plugin = "0x00000001",
    enable = "0x00000002"
}
