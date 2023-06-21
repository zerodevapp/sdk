import { encodePacked, fromBytes, toBytes } from "viem"
import type { BatchUserOperationCallDataWithDelegate, UserOperationCallDataWithDelegate } from "./account"

const encodeCall = (_tx: UserOperationCallDataWithDelegate): string => {
    const data = toBytes(_tx.data)
    const encoded = encodePacked(
        ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
        [_tx.delegateCall ? 1 : 0, _tx.target, _tx.value || BigInt(0), BigInt(data.length), fromBytes(data, 'hex')]
    )
    return encoded.slice(2)
}
export const encodeMultiSend = (_txs: BatchUserOperationCallDataWithDelegate): string => {
    return '0x' + _txs.map((tx) => encodeCall(tx)).join('')
}