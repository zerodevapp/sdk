import { KernelV3AccountAbi, KernelV3ExecuteAbi } from "@zerodev/sdk"
import {
    type CreateKernelAccountReturnType,
    MIGRATION_HELPER_ADDRESS,
    MigrationHelperAbi
} from "@zerodev/sdk/accounts"
import { CALL_TYPE } from "@zerodev/sdk/constants"
import {
    type Call,
    type Hex,
    concat,
    decodeFunctionData,
    encodeAbiParameters,
    encodeFunctionData,
    getAbiItem,
    parseAbiParameters,
    toFunctionSelector,
    zeroAddress
} from "viem"
import { isPermissionMigrated } from "./isPermissionMigrated.js"

export const migrationSessionKeyAccount = async (params: {
    account: CreateKernelAccountReturnType<"0.7">
    permissionId: Hex
}): Promise<CreateKernelAccountReturnType<"0.7">> => {
    const account = params.account
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
        ...params.account,
        async encodeCalls(calls, callType) {
            const isMigrated = await isPermissionMigrated(account.client, {
                account: account.address,
                permissionId: params.permissionId
            })
            const executeCallData = await account.encodeCalls(calls, callType)
            if (isMigrated) {
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
                args: [[], [params.permissionId], execMode, executionCalldata]
            })

            const migrationCall = {
                to: MIGRATION_HELPER_ADDRESS,
                data: migrationCallData,
                value: 0n
            } as Call

            if (account.kernelVersion !== "0.3.0") {
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
