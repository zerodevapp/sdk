import { type Address, type Hex, encodePacked, toBytes } from "viem"
import {
    type CallType,
    type KernelEncodeCallDataArgs
} from "../../types/index.js"

export const MULTISEND_ADDRESS = "0x8ae01fcf7c655655ff2c6ef907b8b4718ab4e17c"

export const multiSendAbi = [
    {
        type: "function",
        name: "multiSend",
        inputs: [{ type: "bytes", name: "transactions" }]
    }
]

const encodeCall = (call: {
    to: Address
    value: bigint
    data: Hex
    callType: CallType | undefined
}): string => {
    const data = toBytes(call.data)
    const encoded = encodePacked(
        ["uint8", "address", "uint256", "uint256", "bytes"],
        [
            call.callType === "delegatecall" ? 1 : 0,
            call.to,
            call.value || 0n,
            BigInt(data.length),
            call.data
        ]
    )
    return encoded.slice(2)
}

export const encodeMultiSend = (calls: KernelEncodeCallDataArgs): Hex => {
    if (!Array.isArray(calls)) {
        throw new Error("Invalid multiSend calls, should use an array of calls")
    }

    return `0x${calls.map((call) => encodeCall(call)).join("")}`
}
