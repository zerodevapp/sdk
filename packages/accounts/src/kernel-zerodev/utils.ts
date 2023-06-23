import { encodePacked, fromBytes, toBytes } from "viem"
import type { BatchUserOperationCallData, UserOperationCallData } from "@alchemy/aa-core"

const encodeCall = (_tx: UserOperationCallData): string => {
    const data = toBytes(_tx.data)
    const encoded = encodePacked(
        ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
        [0, _tx.target, _tx.value || BigInt(0), BigInt(data.length), fromBytes(data, 'hex')]
    )
    return encoded.slice(2)
}
export const encodeMultiSend = (_txs: BatchUserOperationCallData): string => {
    return '0x' + _txs.map((tx) => encodeCall(tx)).join('')
}