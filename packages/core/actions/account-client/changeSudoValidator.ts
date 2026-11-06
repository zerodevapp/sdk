import {
    type Chain,
    type Client,
    type Hash,
    type Hex,
    type Prettify,
    type Transport,
    zeroAddress
} from "viem"
import {
    type SendUserOperationParameters,
    type SmartAccount,
    sendUserOperation
} from "viem/account-abstraction"
import { readContract } from "viem/actions"
import {
    concatHex,
    encodeFunctionData,
    getAction,
    pad,
    parseAccount
} from "viem/utils"
import type { KernelSmartAccountImplementation } from "../../accounts/index.js"
import { KernelV3_1AccountAbi } from "../../accounts/kernel/abi/kernel_v_3_1/KernelAccountAbi.js"
import {
    KERNEL_V3_0,
    KERNEL_V3_1,
    KernelVersionToAddressesMap,
    VALIDATOR_TYPE
} from "../../constants.js"
import { AccountNotFoundError } from "../../errors/index.js"
import type {
    KernelValidator,
    KernelValidatorHook
} from "../../types/kernel.js"

export type ChangeSudoValidatorParameters<
    account extends SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
> = Prettify<
    Partial<SendUserOperationParameters<account, accountOverride, calls>> & {
        sudoValidator: KernelValidator<string>
        hook?: KernelValidatorHook
    }
>

/**
 * Changes the account's root (sudo) validator to a validator that is not
 * installed yet. Throws if the validator is already installed: Kernel v3 keeps
 * an installed validator's current owner and settings and would silently
 * ignore the new ones.
 *
 * @deprecated Changing the owner of an installed validator is not supported on
 * Kernel v3. This action will be removed in a future major release.
 */
export async function changeSudoValidator<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account>,
    args: Prettify<
        ChangeSudoValidatorParameters<account, accountOverride, calls>
    >
): Promise<Hash> {
    const { sudoValidator, hook, ...restArgs } = args

    const account_ = restArgs.account ?? client.account
    if (!account_)
        throw new AccountNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })

    const account = parseAccount(
        account_
    ) as unknown as SmartAccount<KernelSmartAccountImplementation>

    let rootValidatorId: Hex
    if (
        [
            VALIDATOR_TYPE.PERMISSION,
            VALIDATOR_TYPE.SECONDARY,
            VALIDATOR_TYPE.EIP7702
        ].includes(VALIDATOR_TYPE[sudoValidator.validatorType])
    ) {
        rootValidatorId = concatHex([
            VALIDATOR_TYPE[sudoValidator.validatorType],
            pad(sudoValidator.getIdentifier(), {
                size: 20,
                dir: "right"
            })
        ])
    } else {
        throw new Error(
            `Cannot change sudo validator to type ${sudoValidator.validatorType}`
        )
    }

    if (await isValidationInstalled(account, rootValidatorId)) {
        throw new Error(
            "changeSudoValidator: this validator is already installed on the account. Kernel v3 keeps an installed validator's current owner and settings, so the new ones would be silently ignored. Changing the owner of an installed validator is not supported; use a validator that is not installed yet."
        )
    }

    const validatorData = await sudoValidator.getEnableData(account.address)

    const hookId = hook?.getIdentifier() ?? zeroAddress

    const hookData = (await hook?.getEnableData(account.address)) ?? "0x"

    /**
     * @dev Kernel v3.0 does not support changeRootValidator directly, so we need to use delegatecall to call changeRootValidator on Kernel v3.1 implementation contract
     */
    if (account.kernelVersion === KERNEL_V3_0) {
        return await getAction(
            client,
            sendUserOperation,
            "sendUserOperation"
        )({
            ...restArgs,
            callData: await account.encodeCalls(
                [
                    {
                        to: KernelVersionToAddressesMap[KERNEL_V3_1]
                            .accountImplementationAddress,
                        value: 0n,
                        data: encodeFunctionData({
                            abi: KernelV3_1AccountAbi,
                            functionName: "changeRootValidator",
                            args: [
                                rootValidatorId,
                                hookId,
                                validatorData,
                                hookData
                            ]
                        })
                    }
                ],
                "delegatecall"
            )
        } as SendUserOperationParameters)
    }

    /**
     * @dev Kernel v3.1 supports changeRootValidator directly
     */
    return await getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({
        ...restArgs,
        callData: await account.encodeCalls([
            {
                to: account.address,
                value: 0n,
                data: encodeFunctionData({
                    abi: KernelV3_1AccountAbi,
                    functionName: "changeRootValidator",
                    args: [rootValidatorId, hookId, validatorData, hookData]
                })
            }
        ])
    } as SendUserOperationParameters)
}

// Kernel v3's changeRootValidator only installs a validator that is not
// installed yet; for an installed one it keeps the old data and drops the new.
async function isValidationInstalled(
    account: SmartAccount<KernelSmartAccountImplementation>,
    validationId: Hex
): Promise<boolean> {
    if (!(await account.isDeployed())) {
        // The first user op deploys the account with its root validator.
        const { identifier } =
            await account.kernelPluginManager.getValidatorInitData()
        return identifier.toLowerCase() === validationId.toLowerCase()
    }
    const { hook } = await getAction(
        account.client,
        readContract,
        "readContract"
    )({
        address: account.address,
        abi: KernelV3_1AccountAbi,
        functionName: "validationConfig",
        args: [validationId]
    })
    return hook !== zeroAddress
}
