import type { EntryPoint } from "permissionless/types"
import type { GetEntryPointVersion } from "permissionless/types/entrypoint"
import type {
    UserOperation,
    UserOperationWithBigIntAsHex
} from "permissionless/types/userOperation"
import { type Address, type Hex, type LocalAccount } from "viem"
import type { PartialBy } from "viem/types/utils"
export type ZeroDevPaymasterRpcSchema = [
    {
        Method: "zd_sponsorUserOperation"
        Parameters: [
            {
                chainId: number
                userOp: PartialBy<
                    UserOperationWithBigIntAsHex<"v0.6">,
                    | "callGasLimit"
                    | "preVerificationGas"
                    | "verificationGasLimit"
                    | "paymasterAndData"
                >
                entryPointAddress: Address
                gasTokenData?: {
                    tokenAddress: Hex
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
    },
    {
        Method: "zd_pm_accounts"
        Parameters: [
            {
                chainId: number
                entryPointAddress: Address
            }
        ]
        ReturnType: Address[]
    }
]

export type KernelValidator<
    entryPoint extends EntryPoint,
    Name extends string = string
> = LocalAccount<Name> & {
    getNonceKey: () => Promise<bigint>
    getDummySignature(
        userOperation: UserOperation<GetEntryPointVersion<entryPoint>>,
        pluginEnableSignature?: Hex
    ): Promise<Hex>
    signUserOperation: (
        userOperation: UserOperation<GetEntryPointVersion<entryPoint>>,
        pluginEnableSignature?: Hex
    ) => Promise<Hex>
    getEnableData(accountAddress?: Address): Promise<Hex>
    isEnabled(accountAddress: Address, selector: Hex): Promise<boolean>
}

export type ValidatorInitData = {
    validatorAddress: Address
    enableData: Hex
}

export type KernelPluginManager<entryPoint extends EntryPoint> =
    KernelValidator<entryPoint> & {
        getPluginEnableSignature(accountAddress: Address): Promise<Hex>
        getValidatorInitData(): Promise<ValidatorInitData>
        getExecutorData(): ExecutorData
        getValidityData(): PluginValidityData
    }

export type KernelPluginManagerParams<entryPoint extends EntryPoint> = {
    sudo?: KernelValidator<entryPoint>
    regular?: KernelValidator<entryPoint>
    pluginEnableSignature?: Hex
    validatorInitData?: ValidatorInitData
    executorData?: ExecutorData
} & Partial<PluginValidityData>

export type ExecutorData = {
    executor: Address
    selector: Hex
}

export type PluginValidityData = {
    validUntil: number
    validAfter: number
}

export enum ValidatorMode {
    sudo = "0x00000000",
    plugin = "0x00000001",
    enable = "0x00000002"
}

export type CallType = "call" | "delegatecall"

export type KernelEncodeCallDataArgs =
    | {
          to: Address
          value: bigint
          data: Hex
          callType: CallType | undefined
      }
    | {
          to: Address
          value: bigint
          data: Hex
          callType: CallType | undefined
      }[]
