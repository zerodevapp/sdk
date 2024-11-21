import { decodeAbiParameters, type Hex } from "viem"

export function decodeExecuteBatchCall(callData: Hex) {
    const [calls] =  decodeAbiParameters(
        [
            {
                name: "executionBatch",
                type: "tuple[]",
                components: [
                    {
                        name: "to",
                        type: "address"
                    },
                    {
                        name: "value",
                        type: "uint256"
                    },
                    {
                        name: "data",
                        type: "bytes"
                    }
                ]
            }
        ],
        callData
    )
    return calls
}
