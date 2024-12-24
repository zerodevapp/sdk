import type { Chain, Client, Hash, Prettify, Transport } from "viem"
import {
    type SendUserOperationParameters,
    type SmartAccount,
    sendUserOperation
} from "viem/account-abstraction"
import { encodeFunctionData, getAction, parseAccount } from "viem/utils"
import { KernelV3AccountAbi } from "../../accounts/kernel/abi/kernel_v_3_0_0/KernelAccountAbi.js"
import { KernelVersionToAddressesMap } from "../../constants.js"
import { AccountNotFoundError } from "../../errors/index.js"
import type { KERNEL_VERSION_TYPE } from "../../types/kernel.js"
import { validateKernelVersionWithEntryPoint } from "../../utils.js"

export type UpgradeKernelParameters<
    account extends SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
> = Prettify<
    Partial<SendUserOperationParameters<account, accountOverride, calls>> & {
        kernelVersion: KERNEL_VERSION_TYPE
    }
>

export async function upgradeKernel<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account>,
    args: Prettify<UpgradeKernelParameters<account, accountOverride, calls>>
): Promise<Hash> {
    const { account: account_ = client.account, kernelVersion } = args
    if (!account_)
        throw new AccountNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })

    const account = parseAccount(account_) as SmartAccount
    validateKernelVersionWithEntryPoint(
        account.entryPoint.version,
        kernelVersion
    )
    const implementation =
        KernelVersionToAddressesMap[kernelVersion].accountImplementationAddress

    return await getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({
        ...args,
        calls: [
            {
                to: account.address,
                data: encodeFunctionData({
                    abi: KernelV3AccountAbi,
                    functionName: "upgradeTo",
                    args: [implementation]
                }),
                value: 0n
            }
        ],
        account
    } as SendUserOperationParameters)
}
