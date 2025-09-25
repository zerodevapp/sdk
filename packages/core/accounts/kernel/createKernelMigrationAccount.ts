import {
    type Call,
    concat,
    concatHex,
    decodeFunctionData,
    encodeAbiParameters,
    encodeFunctionData,
    getAbiItem,
    pad,
    parseAbiParameters,
    toFunctionSelector,
    zeroAddress
} from "viem"
import type { EntryPointVersion } from "viem/account-abstraction"
import { readContract } from "viem/actions"
import { getAction } from "viem/utils"
import { CALL_TYPE, VALIDATOR_TYPE } from "../../constants.js"
import type { GetKernelVersion, KernelValidator } from "../../types/kernel.js"
import { MigrationHelperAbi } from "./abi/MigrationHelperAbi.js"
import {
    KernelV3AccountAbi,
    KernelV3ExecuteAbi
} from "./abi/kernel_v_3_0_0/KernelAccountAbi.js"
import {
    type CreateKernelAccountParameters,
    type CreateKernelAccountReturnType,
    type KernelSmartAccountImplementation,
    createKernelAccount
} from "./createKernelAccount.js"

export type CreateKernelMigrationAccountParameters<
    entryPointVersion extends EntryPointVersion,
    KernelVerion extends GetKernelVersion<entryPointVersion>
> = Omit<
    CreateKernelAccountParameters<entryPointVersion, KernelVerion>,
    "plugins"
> & {
    plugins: {
        sudo: {
            migrate: {
                from: KernelValidator
                to: KernelValidator
            }
        }
    }
}

export const MIGRATION_HELPER_ADDRESS =
    "0xdb8D1300EA89549B0FE3863Bba5De0096fa1EeD2"

export async function createKernelMigrationAccount<
    entryPointVersion extends EntryPointVersion,
    KernelVersion extends GetKernelVersion<entryPointVersion>
>(
    client: KernelSmartAccountImplementation["client"],
    params: CreateKernelMigrationAccountParameters<
        entryPointVersion,
        KernelVersion
    >
): Promise<
    CreateKernelAccountReturnType<entryPointVersion> & {
        getRootValidatorMigrationStatus?: () => Promise<boolean>
    }
> {
    if (params.entryPoint.version !== "0.7") {
        throw new Error("Only EntryPoint 0.7 is supported")
    }
    const {
        plugins: {
            sudo: {
                migrate: { from: fromValidator, to: toValidator }
            }
        },
        ...rest
    } = params
    const account = await createKernelAccount(client, {
        plugins: {
            sudo: fromValidator
        },
        ...rest
    })

    let isRootValidatorMigrated = false
    let isAccountDeployed = false
    const getRootValidatorMigrationStatus = async () => {
        try {
            if (isRootValidatorMigrated) return isRootValidatorMigrated
            const rootValidator = await getAction(
                client,
                readContract,
                "readContract"
            )({
                address: account.address,
                abi: KernelV3AccountAbi,
                functionName: "rootValidator",
                args: []
            })

            const toRootValidatorId = concatHex([
                VALIDATOR_TYPE[toValidator.validatorType],
                pad(toValidator.getIdentifier(), {
                    size: 20,
                    dir: "right"
                })
            ])
            isRootValidatorMigrated =
                rootValidator.toLowerCase() === toRootValidatorId.toLowerCase()
            return isRootValidatorMigrated
        } catch (error) {
            return false
        }
    }
    ;[isAccountDeployed, isRootValidatorMigrated] = await Promise.all([
        account.isDeployed(),
        getRootValidatorMigrationStatus()
    ])
    if (isAccountDeployed && isRootValidatorMigrated) {
        return createKernelAccount(client, {
            plugins: {
                sudo: toValidator
            },
            ...rest,
            address: account.address
        })
    }
    const installFallbackCallData = encodeFunctionData({
        abi: KernelV3AccountAbi,
        functionName: "installModule",
        args: [
            3n,
            MIGRATION_HELPER_ADDRESS,
            concat([
                toFunctionSelector(
                    getAbiItem({
                        abi: MigrationHelperAbi,
                        name: "migrateWithCall"
                    })
                ),
                zeroAddress,
                encodeAbiParameters(
                    parseAbiParameters(
                        "bytes selectorInitData, bytes hookInitData"
                    ),
                    [CALL_TYPE.DELEGATE_CALL, "0x0000"]
                )
            ])
        ]
    })
    const installFallbackCall = {
        to: account.address,
        data: installFallbackCallData,
        value: 0n
    }
    const uninstallFallbackCallData = encodeFunctionData({
        abi: KernelV3AccountAbi,
        functionName: "uninstallModule",
        args: [
            3n,
            MIGRATION_HELPER_ADDRESS,
            concat([
                toFunctionSelector(
                    getAbiItem({
                        abi: MigrationHelperAbi,
                        name: "migrateWithCall"
                    })
                ),
                "0x"
            ])
        ]
    })
    const uninstallFallbackCall = {
        to: account.address,
        data: uninstallFallbackCallData,
        value: 0n
    }
    return {
        ...account,
        getRootValidatorMigrationStatus,
        async encodeCalls(calls, callType) {
            const isRootValidatorMigrated =
                await getRootValidatorMigrationStatus()
            const executeCallData = await account.encodeCalls(calls, callType)
            if (isRootValidatorMigrated) {
                return executeCallData
            }
            const {
                args: [execMode, executionCalldata]
            } = decodeFunctionData({
                abi: [getAbiItem({ abi: KernelV3ExecuteAbi, name: "execute" })],
                data: executeCallData
            })
            const migrationCallData = encodeFunctionData({
                abi: MigrationHelperAbi,
                functionName: "migrateWithCall",
                args: [[], [], execMode, executionCalldata]
            })

            const migrationCall = {
                to: MIGRATION_HELPER_ADDRESS,
                data: migrationCallData,
                value: 0n
            } as Call

            if (params.kernelVersion !== "0.3.0") {
                return account.encodeCalls([migrationCall], "delegatecall")
            }

            migrationCall.to = account.address
            const finalCalls = [
                installFallbackCall,
                migrationCall,
                uninstallFallbackCall
            ]

            return account.encodeCalls(finalCalls, "call")
        }
    }
}
