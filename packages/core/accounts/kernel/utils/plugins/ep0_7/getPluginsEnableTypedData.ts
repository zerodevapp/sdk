import type {
    ENTRYPOINT_ADDRESS_V07_TYPE,
    EntryPoint
} from "permissionless/types/entrypoint"
import {
    type Address,
    type CustomSource,
    concat,
    encodeAbiParameters,
    pad,
    parseAbiParameters,
    zeroAddress
} from "viem"
import { CALL_TYPE, VALIDATOR_TYPE } from "../../../../../constants.js"
import type { Kernel2_0_plugins } from "../ep0_6/getPluginsEnableTypedData.js"
import { type KernelValidatorHook } from "../../../../../types/kernel.js"

export const getPluginsEnableTypedData = async <
    entryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE
>({
    accountAddress,
    chainId,
    kernelVersion,
    action,
    hook,
    validator,
    validatorNonce
}: {
    accountAddress: Address
    chainId: number
    kernelVersion: string
    validatorNonce: number
    hook?: KernelValidatorHook
} & Kernel2_0_plugins<entryPoint>): Promise<
    Parameters<CustomSource["signTypedData"]>[0]
> => {
    console.log("getPluginsEnableTypedData")
    console.log("hook?.getIdentifier()", hook?.getIdentifier())
    console.log(
        "(await hook?.getEnableData(accountAddress))",
        await hook?.getEnableData(accountAddress)
    )

    return {
        domain: {
            name: "Kernel",
            version: kernelVersion,
            chainId,
            verifyingContract: accountAddress
        },
        types: {
            Enable: [
                { name: "validationId", type: "bytes21" },
                { name: "nonce", type: "uint32" },
                { name: "hook", type: "address" },
                { name: "validatorData", type: "bytes" },
                { name: "hookData", type: "bytes" },
                { name: "selectorData", type: "bytes" }
            ]
        },
        message: {
            validationId: concat([
                VALIDATOR_TYPE[validator.validatorType],
                pad(validator.getIdentifier(), { size: 20, dir: "right" })
            ]),
            nonce: validatorNonce,
            hook: hook?.getIdentifier() ?? zeroAddress,
            validatorData: await validator.getEnableData(accountAddress),
            hookData: (await hook?.getEnableData(accountAddress)) ?? "0x",
            selectorData: concat([
                action.selector,
                action.address,
                action.hook?.address ?? zeroAddress,
                encodeAbiParameters(
                    parseAbiParameters(
                        "bytes selectorInitData, bytes hookInitData"
                    ),
                    [CALL_TYPE.DELEGATE_CALL, "0x0000"]
                )
            ])
        },
        primaryType: "Enable"
    }
}
