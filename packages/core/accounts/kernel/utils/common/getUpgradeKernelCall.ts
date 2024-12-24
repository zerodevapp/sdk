import { encodeFunctionData } from "viem"
import type { SmartAccount, UserOperationCall } from "viem/account-abstraction"
import { KernelVersionToAddressesMap } from "../../../../constants.js"
import type { KERNEL_VERSION_TYPE } from "../../../../types/kernel.js"
import { validateKernelVersionWithEntryPoint } from "../../../../utils.js"
import { KernelV3AccountAbi } from "../../abi/kernel_v_3_0_0/KernelAccountAbi.js"

export function getUpgradeKernelCall(
    account: SmartAccount,
    kernelVersion: KERNEL_VERSION_TYPE
): UserOperationCall {
    validateKernelVersionWithEntryPoint(
        account.entryPoint.version,
        kernelVersion
    )
    const implementation =
        KernelVersionToAddressesMap[kernelVersion].accountImplementationAddress

    return {
        to: account.address,
        data: encodeFunctionData({
            abi: KernelV3AccountAbi,
            functionName: "upgradeTo",
            args: [implementation]
        }),
        value: 0n
    }
}
