import {
    type Hex,
    concat,
    encodeAbiParameters,
    parseAbiParameters,
    zeroAddress
} from "viem"
import { CALL_TYPE } from "../../../../../constants.js"
import type {
    Action,
    KernelValidatorHook
} from "../../../../../types/kernel.js"

export const getEncodedPluginsData = async ({
    enableSignature,
    userOpSignature,
    action,
    enableData,
    hook
}: {
    enableSignature: Hex
    userOpSignature: Hex
    action: Action
    enableData: Hex
    hook?: KernelValidatorHook
}) => {
    return concat([
        hook?.getIdentifier() ?? zeroAddress, // hook address 20 bytes
        encodeAbiParameters(
            parseAbiParameters(
                "bytes validatorData, bytes hookData, bytes selectorData, bytes enableSig, bytes userOpSig"
            ),
            [
                enableData,
                (await hook?.getEnableData()) ?? "0x",
                concat([
                    action.selector,
                    action.address,
                    action.hook?.address ?? zeroAddress,
                    encodeAbiParameters(
                        parseAbiParameters(
                            "bytes selectorInitData, bytes hookInitData"
                        ),
                        // [TODO]: Add support for other call_type
                        [CALL_TYPE.DELEGATE_CALL, "0x0000"]
                    )
                ]),
                enableSignature,
                userOpSignature
            ]
        )
    ])
}
