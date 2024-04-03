import type {
    ENTRYPOINT_ADDRESS_V07_TYPE,
    EntryPoint
} from "permissionless/types/entrypoint"
import { type Address, type CustomSource, concat, zeroAddress } from "viem"
import { VALIDATOR_TYPE } from "../../../../../constants.js"
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
                validator.getIdentifier()
            ]),
            nonce: validatorNonce,
            hook: zeroAddress,
            validatorData: await validator.getEnableData(accountAddress),
            hookData: "0x",
            selectorData: concat([
                action.selector,
                action.address,
                zeroAddress,
                "0x"
            ])
        },
        primaryType: "Enable"
    }
}
