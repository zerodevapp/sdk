import {
    type SendUserOperationParameters,
    sendUserOperation
} from "permissionless/actions/smartAccount"
import type { EntryPoint, Prettify } from "permissionless/types"
import {
    AccountOrClientNotFoundError,
    parseAccount
} from "permissionless/utils"
import {
    type Chain,
    type Client,
    type Hash,
    type Hex,
    type Transport,
    zeroAddress
} from "viem"
import { concatHex, encodeFunctionData, getAction, pad } from "viem/utils"
import type { KernelSmartAccount } from "../../accounts/index.js"
import { KernelV3_1AccountAbi } from "../../accounts/kernel/abi/kernel_v_3_1/KernelAccountAbi.js"
import {
    KERNEL_V3_0,
    KERNEL_V3_1,
    KernelVersionToAddressesMap,
    VALIDATOR_TYPE
} from "../../constants.js"
import type {
    KernelValidator,
    KernelValidatorHook
} from "../../types/kernel.js"

type OptionalUserOperationParameters<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined =
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined
> = Omit<
    SendUserOperationParameters<entryPoint, TTransport, TChain, TAccount>,
    "userOperation"
> & {
    userOperation?: SendUserOperationParameters<
        entryPoint,
        TTransport,
        TChain,
        TAccount
    >["userOperation"]
}

export type ChangeSudoValidatorParameters<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined =
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined
> = Prettify<
    OptionalUserOperationParameters<
        entryPoint,
        TTransport,
        TChain,
        TAccount
    > & {
        sudoValidator: KernelValidator<entryPoint, string>
        hook?: KernelValidatorHook
    }
>

export async function changeSudoValidator<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined =
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<
        ChangeSudoValidatorParameters<entryPoint, TTransport, TChain, TAccount>
    >
): Promise<Hash> {
    const { account: account_ = client.account, sudoValidator, hook } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(account_) as KernelSmartAccount<entryPoint>

    let rootValidatorId: Hex
    if (
        [VALIDATOR_TYPE.PERMISSION, VALIDATOR_TYPE.SECONDARY].includes(
            VALIDATOR_TYPE[sudoValidator.validatorType]
        )
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

    const validatorData = await sudoValidator.getEnableData(account.address)

    const hookId = hook?.getIdentifier() ?? zeroAddress

    const hookData = (await hook?.getEnableData(account.address)) ?? "0x"

    /**
     * @dev Kernel v3.0 does not support changeRootValidator directly, so we need to use delegatecall to call changeRootValidator on Kernel v3.1 implementation contract
     */
    if (account.kernelVersion === KERNEL_V3_0) {
        return await getAction(
            client,
            sendUserOperation<entryPoint, TTransport, TChain, TAccount>,
            "sendUserOperation"
        )({
            ...args,
            userOperation: {
                callData: await account.encodeCallData({
                    to: KernelVersionToAddressesMap[KERNEL_V3_1]
                        .accountImplementationAddress,
                    value: 0n,
                    data: encodeFunctionData({
                        abi: KernelV3_1AccountAbi,
                        functionName: "changeRootValidator",
                        args: [rootValidatorId, hookId, validatorData, hookData]
                    }),
                    callType: "delegatecall"
                })
            }
        } as SendUserOperationParameters<
            entryPoint,
            TTransport,
            TChain,
            TAccount
        >)
    }

    /**
     * @dev Kernel v3.1 supports changeRootValidator directly
     */
    return await getAction(
        client,
        sendUserOperation<entryPoint, TTransport, TChain, TAccount>,
        "sendUserOperation"
    )({
        ...args,
        userOperation: {
            callData: await account.encodeCallData({
                to: account.address,
                value: 0n,
                data: encodeFunctionData({
                    abi: KernelV3_1AccountAbi,
                    functionName: "changeRootValidator",
                    args: [rootValidatorId, hookId, validatorData, hookData]
                })
            })
        }
    } as SendUserOperationParameters<entryPoint, TTransport, TChain, TAccount>)
}
