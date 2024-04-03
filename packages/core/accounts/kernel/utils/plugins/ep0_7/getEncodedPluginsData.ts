import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint
} from "permissionless/types/entrypoint"
import {
    type Address,
    type Hex,
    concat,
    encodeAbiParameters,
    parseAbiParameters,
    zeroAddress
} from "viem"
import type { Kernel2_0_plugins } from "../ep0_6/getPluginsEnableTypedData.js"

export const getEncodedPluginsData = async <
    entryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V06_TYPE
>({
    accountAddress,
    enableSignature,
    userOpSignature,
    action,
    validator
}: {
    accountAddress: Address
    enableSignature: Hex
    userOpSignature: Hex
} & Kernel2_0_plugins<entryPoint>) => {
    const enableData = await validator.getEnableData(accountAddress)
    return concat([
        zeroAddress, // hook address 20 bytes
        encodeAbiParameters(
            parseAbiParameters(
                "bytes validatorData, bytes hookData, bytes selectorData, bytes enableSig, bytes userOpSig"
            ),
            [
                enableData,
                "0x",
                concat([action.selector, action.address, zeroAddress, "0x"]),
                enableSignature,
                userOpSignature
            ]
        )
    ])
}
