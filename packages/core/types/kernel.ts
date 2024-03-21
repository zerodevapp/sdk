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
                    UserOperationWithBigIntAsHex,
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
    },
    {
        Method: "stackup_getERC20TokenQuotes"
        Parameters: [
            {
                chainId: number
                userOp: UserOperationWithBigIntAsHex
                entryPointAddress: Address
                tokenAddress: Address
            }
        ]
        ReturnType: {
            maxGasCostToken: string
            tokenDecimals: string
        }
    }
]

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
        isEnabled(accountAddress: Address, selector: Hex): Promise<boolean>
    }

export type ValidatorInitData = {
    validatorAddress: Address
    enableData: Hex
}

export type KernelPluginManager = KernelValidator & {
    getPluginEnableSignature(accountAddress: Address): Promise<Hex>
    getValidatorInitData(): Promise<ValidatorInitData>
    getExecutorData(): ExecutorData
    getValidityData(): PluginValidityData
}

export type KernelPluginManagerParams = {
    sudo?: KernelValidator
    regular?: KernelValidator
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
