import {
    concat,
    concatHex,
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
import {
    CALL_TYPE,
    KERNEL_V3_1,
    KernelVersionToAddressesMap,
    VALIDATOR_TYPE
} from "../../constants.js"
import type { GetKernelVersion, KernelValidator } from "../../types/kernel.js"
import { KernelV3AccountAbi } from "./abi/kernel_v_3_0_0/KernelAccountAbi.js"
import { KernelV3_1AccountAbi } from "./abi/kernel_v_3_1/KernelAccountAbi.js"
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
    const rootValidatorId = concatHex([
        VALIDATOR_TYPE[toValidator.validatorType],
        pad(toValidator.getIdentifier(), {
            size: 20,
            dir: "right"
        })
    ])
    const validatorData = await toValidator.getEnableData(account.address)

    const hookId = zeroAddress

    const hookData = "0x"
    const changeRootValidatorCallData = encodeFunctionData({
        abi: KernelV3_1AccountAbi,
        functionName: "changeRootValidator",
        args: [rootValidatorId, hookId, validatorData, hookData]
    })
    const installFallbackCallData = encodeFunctionData({
        abi: KernelV3AccountAbi,
        functionName: "installModule",
        args: [
            3n,
            KernelVersionToAddressesMap[KERNEL_V3_1]
                .accountImplementationAddress,
            concat([
                toFunctionSelector(
                    getAbiItem({
                        abi: KernelV3_1AccountAbi,
                        name: "changeRootValidator"
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
    const updateValidatorCall = {
        to: account.address,
        data: changeRootValidatorCallData,
        value: 0n
    }
    const updateCalls =
        rest.kernelVersion === "0.3.0"
            ? [installFallbackCall, updateValidatorCall]
            : [updateValidatorCall]
    return {
        ...account,
        getRootValidatorMigrationStatus,
        async encodeCalls(calls, callType) {
            const _calls = (await getRootValidatorMigrationStatus())
                ? calls
                : [...updateCalls, ...calls]
            return account.encodeCalls(_calls, callType)
        }
    }
}
