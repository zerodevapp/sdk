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

export const getPluginsEnableTypedData = async <
    entryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE
>({
    accountAddress,
    chainId,
    kernelVersion,
    action,
    validator,
    validatorNonce
}: {
    accountAddress: Address
    chainId: number
    kernelVersion: string
    validatorNonce: number
} & Kernel2_0_plugins<entryPoint>): Promise<
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
            hook: zeroAddress,
            validatorData: await validator.getEnableData(accountAddress),
            hookData: "0x",
            selectorData: concat([
                action.selector,
                action.address,
                zeroAddress,
                encodeAbiParameters(
                    parseAbiParameters(
                        "bytes selectorInitData, bytes hookInitData"
                    ),
                    [CALL_TYPE.DELEGATE_CALL, "0x"]
                )
            ])
        },
        primaryType: "Enable"
    }
}
