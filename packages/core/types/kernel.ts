import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint
} from "permissionless/types"
import type { GetEntryPointVersion } from "permissionless/types/entrypoint"
import type {
    UserOperation,
    UserOperationWithBigIntAsHex
} from "permissionless/types/userOperation"
import type { Address, CustomSource, Hex, LocalAccount } from "viem"
import type { PartialBy } from "viem/types/utils"
import type { VALIDATOR_TYPE } from "../constants.js"
export type ZeroDevPaymasterRpcSchema<entryPoint extends EntryPoint> = [
    {
        Method: "zd_sponsorUserOperation"
        Parameters: [
            {
                chainId: number
                userOp: GetEntryPointVersion<entryPoint> extends "v0.6"
                    ? PartialBy<
                          UserOperationWithBigIntAsHex<"v0.6">,
                          | "callGasLimit"
                          | "preVerificationGas"
                          | "verificationGasLimit"
                      >
                    : PartialBy<
                          UserOperationWithBigIntAsHex<"v0.7">,
                          | "callGasLimit"
                          | "preVerificationGas"
                          | "verificationGasLimit"
                          | "paymasterVerificationGasLimit"
                          | "paymasterPostOpGasLimit"
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
        ReturnType: GetEntryPointVersion<entryPoint> extends "v0.6"
            ? {
                  paymasterAndData: Hex
                  preVerificationGas: Hex
                  verificationGasLimit: Hex
                  callGasLimit: Hex
                  maxFeePerGas?: Hex
                  maxPriorityFeePerGas?: Hex
                  paymaster?: never
                  paymasterVerificationGasLimit?: never
                  paymasterPostOpGasLimit?: never
                  paymasterData?: never
              }
            : {
                  preVerificationGas: Hex
                  verificationGasLimit: Hex
                  callGasLimit: Hex
                  paymaster: Address
                  paymasterVerificationGasLimit: Hex
                  paymasterPostOpGasLimit: Hex
                  paymasterData: Hex
                  maxFeePerGas?: Hex
                  maxPriorityFeePerGas?: Hex
                  paymasterAndData?: never
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
                userOp: UserOperationWithBigIntAsHex<"v0.6">
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

export type ZeroDevUserOperationGasPriceWithBigIntAsHex = {
    slow: {
        maxFeePerGas: Hex
        maxPriorityFeePerGas: Hex
    }
    standard: {
        maxFeePerGas: Hex
        maxPriorityFeePerGas: Hex
    }
    fast: {
        maxFeePerGas: Hex
        maxPriorityFeePerGas: Hex
    }
}

export type ZeroDevAccountClientRpcSchema = [
    {
        Method: "zd_getUserOperationGasPrice"
        Parameters: []
        ReturnType: ZeroDevUserOperationGasPriceWithBigIntAsHex
    }
]

export type ValidatorType = Extract<
    keyof typeof VALIDATOR_TYPE,
    "PERMISSION" | "SECONDARY"
>

export type KernelValidator<
    entryPoint extends EntryPoint,
    Name extends string = string
> = LocalAccount<Name> & {
    validatorType: ValidatorType
    supportedKernelVersions: string
    getNonceKey: (
        accountAddress?: Address,
        customNonceKey?: bigint
    ) => Promise<bigint>
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
    getIdentifier: () => Hex
}

export type KernelValidatorHook = {
    getEnableData(accountAddress?: Address): Promise<Hex>
    getIdentifier: () => Hex
}

export type ValidatorInitData = {
    validatorAddress: Address
    enableData: Hex
    identifier: Hex
}

export type KernelPluginManager<entryPoint extends EntryPoint> =
    KernelValidator<entryPoint> & {
        sudoValidator?: KernelValidator<entryPoint>
        hook?: KernelValidatorHook
        getPluginEnableSignature(accountAddress: Address): Promise<Hex>
        getValidatorInitData(): Promise<ValidatorInitData>
        getAction(): Action
        getValidityData(): PluginValidityData
        getIdentifier(isSudo?: boolean): Hex
        encodeModuleInstallCallData: (accountAddress: Address) => Promise<Hex>
        getPluginsEnableTypedData: (
            accountAddress: Address
        ) => Promise<Parameters<CustomSource["signTypedData"]>[0]>
        signUserOperationWithActiveValidator: (
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
        ) => Promise<Hex>
    }

export type PluginInstallData<entryPoint extends EntryPoint> =
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE
        ? {
              selector: Hex
              executor: Address
              validator: Address
              validUntil: number
              validAfter: number
              enableData: Hex
          }
        : // TODO: Add support for EP v0.7
          never

export type KernelPluginManagerParams<entryPoint extends EntryPoint> = {
    sudo?: KernelValidator<entryPoint>
    regular?: KernelValidator<entryPoint>
    hook?: KernelValidatorHook
    pluginEnableSignature?: Hex
    validatorInitData?: ValidatorInitData
    action?: Action
    entryPoint: entryPoint
    kernelVersion: KERNEL_VERSION_TYPE
} & Partial<PluginValidityData>

export type Hook = {
    address: Address
}

export type Action = {
    address: Address
    selector: Hex
    hook?: Hook
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

export type Execution = {
    target: Address
    value: bigint
    callData: Hex
}

export type KERNEL_V2_VERSION_TYPE = "0.0.2" | "0.2.2" | "0.2.3" | "0.2.4"

export type KERNEL_V3_VERSION_TYPE = "0.3.0" | "0.3.1"

export type KERNEL_VERSION_TYPE =
    | KERNEL_V2_VERSION_TYPE
    | KERNEL_V3_VERSION_TYPE

export type GetKernelVersion<entryPoint extends EntryPoint> =
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE
        ? KERNEL_V2_VERSION_TYPE
        : KERNEL_V3_VERSION_TYPE
