import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint
} from "permissionless/types/entrypoint"
import {
    type Address,
    type CustomSource,
    concatHex,
    hexToBigInt,
    pad,
    toHex
} from "viem"
import type {
    Action,
    KernelValidator,
    PluginValidityData
} from "../../../../../types/index.js"

export type Kernel2_0_plugins<entryPoint extends EntryPoint> = {
    validator: KernelValidator<entryPoint>
    action: Action
}
export const getPluginsEnableTypedData = async <
    entryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V06_TYPE
>({
    accountAddress,
    chainId,
    kernelVersion,
    action,
    validator,
    validUntil,
    validAfter
}: {
    accountAddress: Address
    chainId: number
    kernelVersion: string
} & Kernel2_0_plugins<entryPoint> &
    PluginValidityData): Promise<
    Parameters<CustomSource["signTypedData"]>[0]
> => {
    return {
        domain: {
            name: "Kernel",
            version: kernelVersion,
            chainId,
            verifyingContract: accountAddress
        },
        types: {
            ValidatorApproved: [
                { name: "sig", type: "bytes4" },
                { name: "validatorData", type: "uint256" },
                { name: "executor", type: "address" },
                { name: "enableData", type: "bytes" }
            ]
        },
        message: {
            sig: action.selector,
            validatorData: hexToBigInt(
                concatHex([
                    pad(toHex(validUntil ?? 0), {
                        size: 6
                    }),
                    pad(toHex(validAfter ?? 0), {
                        size: 6
                    }),
                    validator.address
                ]),
                { size: 32 }
            ),
            executor: action.address as Address,
            enableData: await validator.getEnableData(accountAddress)
        },
        primaryType: "ValidatorApproved"
    }
}
